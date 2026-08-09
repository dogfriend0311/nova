// ══════════════════════════════════════════════════════════════
// Diamond League — local multiplayer transport
//
// Honest scope: this is same-device multiplayer (two browser tabs
// or windows, same origin) using BroadcastChannel — no server
// involved. For a friend on a different device, see wsTransport.js,
// which speaks the exact same STATE/INTENT protocol over a real
// network connection instead. MultiplayerGameScreen picks whichever
// of the two transports the lobby configured; nothing else in the
// UI needs to know or care which one is active.
//
// Design note: the host assigns BOTH players (their own and the
// guest's) before creating the room, so the GameSession — and the
// generator inside it — can be constructed immediately, with no
// handshake needed before the game can start. The guest just needs
// to know which side they were assigned.
// ══════════════════════════════════════════════════════════════

const CHANNEL_PREFIX = 'diamond-league-mp:';

export class LocalMultiplayerHost {
  constructor(session, roomCode) {
    this.session = session;
    this.channel = new BroadcastChannel(CHANNEL_PREFIX + roomCode);
    this.channel.onmessage = (e) => this._onMessage(e.data);
    this._unsubs = [
      session.on('prompt', () => this._broadcast()),
      session.on('event', () => this._broadcast()),
      session.on('done', () => this._broadcast()),
    ];
  }

  start() {
    this.session.start();
    this._broadcast();
  }

  _broadcast() {
    this.channel.postMessage({ type: 'STATE', snapshot: this.session.getSnapshot() });
  }

  _onMessage(msg) {
    if (!msg) return;
    if (msg.type === 'HELLO') { this._broadcast(); return; }
    if (msg.type === 'INTENT') {
      try {
        this.session.submitIntent(msg.side, msg.payload);
      } catch (err) {
        // Stale or misrouted intent — ignore rather than crash the host's game.
      }
    }
  }

  close() {
    this._unsubs.forEach(fn => fn());
    this.channel.close();
  }
}

export class LocalMultiplayerGuest {
  constructor(roomCode, side) {
    this.side = side; // 'home' | 'away' — whichever the host assigned
    this.channel = new BroadcastChannel(CHANNEL_PREFIX + roomCode);
    this._listeners = [];
    this.channel.onmessage = (e) => {
      if (e.data?.type === 'STATE') this._listeners.forEach(cb => cb(e.data.snapshot));
    };
    this.channel.postMessage({ type: 'HELLO' });
  }

  onState(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(fn => fn !== cb); };
  }

  submitIntent(payload) {
    this.channel.postMessage({ type: 'INTENT', side: this.side, payload });
  }

  close() { this.channel.close(); }
}

export function isLocalMultiplayerSupported() {
  return typeof BroadcastChannel !== 'undefined';
}
