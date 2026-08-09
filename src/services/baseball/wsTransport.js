// ══════════════════════════════════════════════════════════════
// Diamond League — online multiplayer transport (WebSocket)
//
// Talks to the relay server in /server (deployed separately — see
// server/README.md). The relay does ONE thing: forward JSON messages
// between the two sockets in a room. It never looks at game state,
// never runs the engine, doesn't even parse the payload beyond a
// room code — the host's browser is still the sole authority running
// the actual GameSession, exactly like the local transport. That
// means WebSocketMultiplayerHost/Guest are near-identical to
// LocalMultiplayerHost/Guest in netTransport.js; only the pipe
// changed, not the protocol riding on it.
// ══════════════════════════════════════════════════════════════

function openSocket(relayUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const onOpen = () => { cleanup(); resolve(ws); };
    const onError = (err) => { cleanup(); reject(err); };
    const cleanup = () => { ws.removeEventListener('open', onOpen); ws.removeEventListener('error', onError); };
    ws.addEventListener('open', onOpen);
    ws.addEventListener('error', onError);
  });
}

export class WebSocketMultiplayerHost {
  constructor(session, relayUrl, roomCode) {
    this.session = session;
    this.relayUrl = relayUrl;
    this.roomCode = roomCode;
    this.ws = null;
    this._ready = false;
    this._queue = [];
    this._unsubs = [
      session.on('prompt', () => this._broadcast()),
      session.on('event', () => this._broadcast()),
      session.on('done', () => this._broadcast()),
    ];
  }

  async start() {
    this.ws = await openSocket(this.relayUrl);
    this.ws.onmessage = (e) => this._onMessage(e.data);
    this.ws.onclose = () => { this._ready = false; };
    this._send({ type: 'host', room: this.roomCode });
    this._ready = true;
    this._queue.forEach(msg => this.ws.send(JSON.stringify(msg)));
    this._queue = [];
    this.session.start();
    this._broadcast();
  }

  _send(msg) {
    if (this._ready && this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this._queue.push(msg);
  }

  _broadcast() {
    this._send({ type: 'relay', payload: { type: 'STATE', snapshot: this.session.getSnapshot() } });
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== 'relay' || !msg.payload) return;
    const inner = msg.payload;
    if (inner.type === 'HELLO') { this._broadcast(); return; }
    if (inner.type === 'INTENT') {
      try { this.session.submitIntent(inner.side, inner.payload); }
      catch (err) { /* stale/misrouted intent — ignore rather than crash the host's game */ }
    }
  }

  close() {
    this._unsubs.forEach(fn => fn());
    if (this.ws) this.ws.close();
  }
}

export class WebSocketMultiplayerGuest {
  constructor(relayUrl, roomCode, side) {
    this.side = side;
    this.relayUrl = relayUrl;
    this.roomCode = roomCode;
    this.ws = null;
    this._ready = false;
    this._queue = [];
    this._listeners = [];
    this._errorListeners = [];
    this._connect();
  }

  async _connect() {
    try {
      this.ws = await openSocket(this.relayUrl);
    } catch (err) {
      this._errorListeners.forEach(cb => cb('Could not reach the relay server.'));
      return;
    }
    this.ws.onmessage = (e) => this._onMessage(e.data);
    this.ws.onclose = () => { this._ready = false; };
    this._send({ type: 'join', room: this.roomCode });
    this._send({ type: 'relay', payload: { type: 'HELLO' } });
    this._ready = true;
    this._queue.forEach(msg => this.ws.send(JSON.stringify(msg)));
    this._queue = [];
  }

  _send(msg) {
    if (this._ready && this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this._queue.push(msg);
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'error') { this._errorListeners.forEach(cb => cb(msg.message)); return; }
    if (msg.type === 'relay' && msg.payload?.type === 'STATE') {
      this._listeners.forEach(cb => cb(msg.payload.snapshot));
    }
  }

  onState(cb) { this._listeners.push(cb); return () => { this._listeners = this._listeners.filter(fn => fn !== cb); }; }
  onError(cb) { this._errorListeners.push(cb); return () => { this._errorListeners = this._errorListeners.filter(fn => fn !== cb); }; }

  submitIntent(payload) {
    this._send({ type: 'relay', payload: { type: 'INTENT', side: this.side, payload } });
  }

  close() { if (this.ws) this.ws.close(); }
}

export function isOnlineMultiplayerConfigured() {
  return typeof WebSocket !== 'undefined';
}

export function defaultRelayUrl() {
  return (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_RELAY_URL) || '';
}
