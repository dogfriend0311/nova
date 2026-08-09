// ══════════════════════════════════════════════════════════════
// Diamond League — game session (multiplayer-ready state layer)
//
// The engine's generator is the authoritative simulation, but a raw
// JS generator can't be serialized or handed to a network peer. This
// wraps it in a small state machine with exactly the seam multiplayer
// needs:
//
//   - GameState  → a plain, JSON-safe snapshot (score/inning/outs/
//                  bases/log/current prompt). Safe to send over a
//                  socket or drop in a DB row.
//   - PlayerIntent → { side: 'home'|'away', payload } — the response
//                  to whatever prompt is currently open.
//
// One side (the "host") owns the actual GameSession and runs the
// generator; that's the standard architecture for turn-based network
// games — the guest never needs the generator itself, only state +
// intents. See netTransport.js for a working transport built on this.
// ══════════════════════════════════════════════════════════════

import { createMultiplayerGame } from './engine';

export const PROMPT_KINDS = ['bat-prompt', 'pitch-prompt', 'steal-prompt'];

export class GameSession {
  constructor(homeTeam, awayTeam, { controlledHomeId = null, controlledAwayId = null, innings } = {}) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.controlledHomeId = controlledHomeId;
    this.controlledAwayId = controlledAwayId;
    this.gen = createMultiplayerGame(homeTeam, awayTeam, { controlledHomeId, controlledAwayId, innings });
    this.log = [];
    this.currentPrompt = null;
    this.result = null;
    this.live = { home: 0, away: 0, inning: 1, top: true, outs: 0, bases: [null, null, null] };
    this._listeners = { event: [], prompt: [], done: [] };
  }

  on(type, cb) {
    (this._listeners[type] || (this._listeners[type] = [])).push(cb);
    return () => { this._listeners[type] = this._listeners[type].filter(fn => fn !== cb); };
  }
  _emit(type, payload) { (this._listeners[type] || []).forEach(cb => cb(payload)); }

  start() { this._advance(undefined); return this.getSnapshot(); }

  // side must match whoever the current prompt is routed to — a host
  // relaying intents from a network peer should check whoseTurn() (or
  // just catch the thrown error) before forwarding a stale/misrouted
  // message from a slow or disconnected client.
  submitIntent(side, payload) {
    if (!this.currentPrompt) return this.getSnapshot();
    if (this.currentPrompt.side && this.currentPrompt.side !== side) {
      throw new Error(`It's ${this.currentPrompt.side}'s turn, not ${side}'s.`);
    }
    this._advance(payload);
    return this.getSnapshot();
  }

  whoseTurn() { return this.currentPrompt?.side || null; }
  isDone() { return !!this.result; }

  _advance(input) {
    let res = this.gen.next(input);
    while (!res.done) {
      const ev = res.value;
      if (ev.kind === 'log') {
        this._applyLogEntry(ev.entry);
        this._emit('event', ev.entry);
        res = this.gen.next(undefined);
        continue;
      }
      this.currentPrompt = ev;
      this.live = { ...this.live, bases: ev.bases || this.live.bases, outs: ev.outs ?? this.live.outs };
      this._emit('prompt', ev);
      return;
    }
    this.currentPrompt = null;
    this.result = res.value;
    this._emit('done', this.result);
  }

  _applyLogEntry(e) {
    this.log = [...this.log.slice(-80), e];
    this.live = {
      ...this.live,
      inning: e.inning || this.live.inning,
      top: e.top ?? this.live.top,
      outs: e.outs !== undefined ? e.outs % 3 : this.live.outs,
      home: e.score?.home ?? this.live.home,
      away: e.score?.away ?? this.live.away,
    };
  }

  // Plain-object snapshot — players inside prompt/bases are already
  // JSON-safe plain data (see data.js), so this needs no transform,
  // just a trim of internal-only fields (the generator itself, listeners).
  getSnapshot() {
    return {
      live: this.live,
      log: this.log,
      prompt: this.currentPrompt,
      whoseTurn: this.whoseTurn(),
      done: this.isDone(),
      result: this.result,
    };
  }
}
