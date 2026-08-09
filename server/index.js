// ══════════════════════════════════════════════════════════════
// Diamond League — multiplayer relay server
//
// Deliberately dumb: a room is just two sockets (host + guest) and
// this process forwards whatever JSON either one sends to the other.
// It never parses game state, never runs the engine, and forgets a
// room the moment both sockets are gone — the host's browser is
// still the sole authority for the actual game, exactly as it is in
// same-device (BroadcastChannel) mode. That's what makes this safe
// to run as a single cheap always-on process with no database.
//
// Wire protocol (JSON over the WebSocket):
//   client -> server  { type: 'host', room }              claim a room as host
//   client -> server  { type: 'join', room }               join an existing room as guest
//   client -> server  { type: 'relay', payload }            forward `payload` to the other peer in your room
//   server -> client  { type: 'relay', payload }             the other peer's forwarded payload
//   server -> client  { type: 'error', message }             room taken / room not found / etc.
// ══════════════════════════════════════════════════════════════

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;
const wss = new WebSocketServer({ port: PORT });

// room code -> { host: ws|null, guest: ws|null }
const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, { host: null, guest: null });
  return rooms.get(code);
}

function cleanupSocket(ws) {
  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  if (room.host === ws) room.host = null;
  if (room.guest === ws) room.guest = null;
  if (!room.host && !room.guest) rooms.delete(ws.roomCode);
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'host' && msg.room) {
      const room = getRoom(msg.room);
      if (room.host && room.host.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message: 'That room code is already in use.' }));
        return;
      }
      room.host = ws;
      ws.roomCode = msg.room;
      ws.role = 'host';
      return;
    }

    if (msg.type === 'join' && msg.room) {
      const room = rooms.get(msg.room);
      if (!room || !room.host) {
        ws.send(JSON.stringify({ type: 'error', message: 'No host is waiting in that room.' }));
        return;
      }
      room.guest = ws;
      ws.roomCode = msg.room;
      ws.role = 'guest';
      return;
    }

    if (msg.type === 'relay' && ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      const other = ws.role === 'host' ? room.guest : room.host;
      if (other && other.readyState === 1) other.send(JSON.stringify({ type: 'relay', payload: msg.payload }));
      return;
    }
  });

  ws.on('close', () => cleanupSocket(ws));
  ws.on('error', () => cleanupSocket(ws));
});

console.log(`Diamond League relay listening on :${PORT}`);
