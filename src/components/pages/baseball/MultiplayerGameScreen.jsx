import React, { useEffect, useRef, useState } from 'react';
import { GameSession } from '../../../services/baseball/session';
import { LocalMultiplayerHost, LocalMultiplayerGuest } from '../../../services/baseball/netTransport';
import { WebSocketMultiplayerHost, WebSocketMultiplayerGuest } from '../../../services/baseball/wsTransport';
import { APPROACH_KEYS, PITCH_TYPE_KEYS, ALIGNMENT_KEYS } from '../../../services/baseball/engine';
import {
  FieldCard, MatchupCard, FatigueBar, TimingMeter, StealPrompt,
  nameOf, APPROACH_META, PITCH_META, ALIGN_META, ZONE_WIDTH, ZONE_LABEL,
} from './GameDayScreen';

function clampNum(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Drives the exact same visual vocabulary as GameDayScreen, but every
// action goes through submitIntent(payload) instead of a local
// generator. The host owns the GameSession and calls straight into
// it; the guest posts intents over whichever transport the lobby
// picked (same-device BroadcastChannel or a WebSocket relay) and
// waits for the next STATE snapshot. Neither side's UI code has to
// know or care which transport is under it — that's the whole point
// of keeping GameSession's snapshot/intent shape transport-agnostic.
export default function MultiplayerGameScreen({ home, away, roomCode, isHost, mySide, controlledHomeId, controlledAwayId, transport, relayUrl, onDone, onExit }) {
  const sessionRef = useRef(null);
  const transportRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [connError, setConnError] = useState(null);
  const [tab, setTab] = useState('atbat');
  const [approach, setApproach] = useState('contact');
  const [pitchType, setPitchType] = useState('fastball');
  const [zone, setZone] = useState(4);
  const [alignment, setAlignment] = useState('standard');
  const [aggressive, setAggressive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isHost) {
      const session = new GameSession(home, away, { controlledHomeId, controlledAwayId });
      sessionRef.current = session;
      session.on('prompt', () => setSnapshot(session.getSnapshot()));
      session.on('event', () => setSnapshot(session.getSnapshot()));
      session.on('done', (result) => { setSnapshot(session.getSnapshot()); onDone(result); });
      const host = transport === 'online'
        ? new WebSocketMultiplayerHost(session, relayUrl, roomCode)
        : new LocalMultiplayerHost(session, roomCode);
      transportRef.current = host;
      Promise.resolve(host.start())
        .then(() => { if (!cancelled) setSnapshot(session.getSnapshot()); })
        .catch(() => { if (!cancelled) setConnError("Couldn't reach the relay server. Check the URL and that it's running."); });
    } else {
      const guest = transport === 'online'
        ? new WebSocketMultiplayerGuest(relayUrl, roomCode, mySide)
        : new LocalMultiplayerGuest(roomCode, mySide);
      transportRef.current = guest;
      const unsubState = guest.onState((snap) => {
        setSnapshot(snap);
        if (snap.done && snap.result) onDone(snap.result);
      });
      const unsubErr = guest.onError ? guest.onError((message) => setConnError(message)) : () => {};
      return () => { unsubState(); unsubErr(); guest.close(); };
    }
    return () => { cancelled = true; if (transportRef.current) transportRef.current.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!snapshot?.prompt) return;
    if (snapshot.prompt.kind === 'bat-prompt') setTab('atbat');
    else if (snapshot.prompt.kind === 'pitch-prompt') setTab('pitch');
    else if (snapshot.prompt.kind === 'steal-prompt') setTab('strategy');
  }, [snapshot?.prompt?.kind, snapshot?.prompt?.side]);

  const submit = (payload) => {
    if (isHost) sessionRef.current.submitIntent(mySide, payload);
    else transportRef.current.submitIntent(payload);
  };

  if (connError) {
    return (
      <div className="dl-gd">
        <div className="dl-panel">
          <div className="dl-panel-title">Connection Problem</div>
          <p className="dl-gd-note">{connError}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button className="dl-btn dl-btn-sm dl-btn-ghost" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="dl-gd">
        <div className="dl-panel">
          <div className="dl-panel-title">Room {roomCode}</div>
          <p className="dl-gd-note">{isHost ? 'Starting the room…' : 'Connecting…'}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button className="dl-btn dl-btn-sm dl-btn-ghost" onClick={onExit}>Cancel</button>
        </div>
      </div>
    );
  }

  const { live, prompt, whoseTurn, log } = snapshot;
  const myTurn = prompt && whoseTurn === mySide;
  const bases = live.bases || [null, null, null];
  const battingTeamAbbr = live.top ? away.abbr : home.abbr;

  const onSwingResult = (pct) => {
    let timing = 'take';
    if (pct !== null) {
      if (pct >= 55 && pct <= 72) timing = 'perfect';
      else if (pct >= 38 && pct <= 85) timing = 'good';
      else timing = pct < 38 ? 'early' : 'late';
    }
    submit({ timing, approach });
  };
  const onPitchResult = (pct) => {
    const width = ZONE_WIDTH[zone];
    const accuracy = pct === null ? 0.12 : clampNum(1 - Math.abs(pct - 60) / (width + 40), 0, 1);
    submit({ accuracy, pitchType, alignment });
  };

  return (
    <div className="dl-gd">
      <div className="dl-gd-league-strip">
        <span>Diamond League · {transport === 'online' ? 'Online' : 'Local'} Multiplayer · Room {roomCode}</span>
        <span className="dl-gd-live">You are {mySide === 'home' ? home.abbr : away.abbr}</span>
      </div>

      <div className="dl-gd-scorebug">
        <div className="dl-gd-teams">
          <div className={`dl-gd-team ${live.top ? 'batting' : ''}`}>
            <div><span className="abbr">{away.abbr}</span><span className="rec">{away.city}</span></div>
            <div className="runs">{live.away}</div>
          </div>
          <div className={`dl-gd-team ${!live.top ? 'batting' : ''}`}>
            <div><span className="abbr">{home.abbr}</span><span className="rec">{home.city}</span></div>
            <div className="runs">{live.home}</div>
          </div>
        </div>
        <div className="dl-gd-state-row">
          <div className="dl-gd-inning-block">
            <div className="num">{live.top ? '▲' : '▼'}{live.inning}</div>
            <div className="lbl">{live.top ? 'Top' : 'Bot'}</div>
          </div>
          <div className="dl-gd-count-outs">
            <div className="dl-gd-dots-block">
              <div className="lbl">Outs</div>
              <div className="dl-gd-dots">{[0, 1, 2].map(i => <span key={i} className={`dl-gd-dot out ${i < live.outs ? 'on' : ''}`} />)}</div>
            </div>
            <div className="dl-gd-dots-block">
              <div className="lbl">At Bat</div>
              <div className="dl-gd-batting-abbr">{battingTeamAbbr}</div>
            </div>
          </div>
          <div className="dl-gd-diamond-mini">
            <span className="bp b2" style={bases[1] ? { background: 'var(--dl-amber-bright)', borderColor: 'var(--dl-amber-bright)' } : undefined} />
            <span className="bp b3" style={bases[2] ? { background: 'var(--dl-amber-bright)', borderColor: 'var(--dl-amber-bright)' } : undefined} />
            <span className="bp b1" style={bases[0] ? { background: 'var(--dl-amber-bright)', borderColor: 'var(--dl-amber-bright)' } : undefined} />
          </div>
        </div>
      </div>

      <div className="dl-tabs dl-gd-tabs">
        {['atbat', 'pitch', 'field', 'strategy', 'history'].map(t => (
          <button key={t} className={`dl-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ atbat: 'At Bat', pitch: 'Pitch', field: 'Field', strategy: 'Strategy', history: 'History' }[t]}
          </button>
        ))}
      </div>

      {tab === 'atbat' && (
        <div className="dl-panel">
          {prompt?.kind === 'bat-prompt' ? (
            myTurn ? (
              <>
                <div className="dl-panel-title">You're up — {nameOf(prompt.batter)} vs {nameOf(prompt.pitcher)}</div>
                <FieldCard bases={bases} outs={live.outs} />
                <div className="dl-gd-section-title">Batter Approach</div>
                <div className="dl-gd-opt-grid">
                  {APPROACH_KEYS.map(k => (
                    <button key={k} className={`dl-gd-opt-btn ${approach === k ? 'selected' : ''}`} onClick={() => setApproach(k)}>
                      {APPROACH_META[k].label}<span className="sub">{APPROACH_META[k].sub}</span>
                    </button>
                  ))}
                </div>
                <MatchupCard batter={prompt.batter} pitcher={prompt.pitcher} fatigue={prompt.fatigue} pitchCount={prompt.pitchCount} staminaLimit={prompt.staminaLimit} />
                <TimingMeter actionLabel="⚡ SWING (tap / space)" onResult={onSwingResult} colorVar="--dl-amber" />
                <button className="dl-btn dl-btn-ghost dl-btn-block" onClick={() => submit({ timing: 'take', approach })}>Take Pitch</button>
              </>
            ) : (
              <>
                <div className="dl-panel-title">{nameOf(prompt.batter)} is up vs {nameOf(prompt.pitcher)}</div>
                <FieldCard bases={bases} outs={live.outs} />
                <p className="dl-gd-note">Waiting on your opponent…</p>
              </>
            )
          ) : (
            <>
              <div className="dl-panel-title">{battingTeamAbbr} at the plate</div>
              <FieldCard bases={bases} outs={live.outs} />
              <p className="dl-gd-note">Playing out automatically.</p>
            </>
          )}
        </div>
      )}

      {tab === 'pitch' && (
        <div className="dl-panel">
          {prompt?.kind === 'pitch-prompt' && myTurn ? (
            <>
              <div className="dl-panel-title">You're pitching — {nameOf(prompt.pitcher)} vs {nameOf(prompt.batter)}</div>
              <div className="dl-gd-section-title">Fatigue</div>
              <FatigueBar pitchCount={prompt.pitchCount} staminaLimit={prompt.staminaLimit} />
              <div className="dl-gd-section-title" style={{ marginTop: 14 }}>Select Pitch</div>
              <div className="dl-gd-pitch-types">
                {PITCH_TYPE_KEYS.map(k => (
                  <button key={k} className={`dl-gd-chip-btn ${pitchType === k ? 'selected' : ''}`} onClick={() => setPitchType(k)}>{PITCH_META[k].label}</button>
                ))}
              </div>
              <div className="dl-gd-section-title">Target the Zone <span className="dl-gd-zone-caption">{ZONE_LABEL[zone]}</span></div>
              <div className="dl-gd-zone-wrap">
                <div className="dl-gd-zone-grid">
                  {ZONE_LABEL.map((lbl, i) => (
                    <button key={i} className={`dl-gd-zone-cell ${zone === i ? 'selected' : ''}`} onClick={() => setZone(i)} aria-label={lbl} />
                  ))}
                </div>
              </div>
              <TimingMeter actionLabel="⚾ DELIVER (tap / space)" sweetLo={60 - ZONE_WIDTH[zone] / 2} sweetHi={60 + ZONE_WIDTH[zone] / 2} colorVar="--dl-clay" onResult={onPitchResult} />
            </>
          ) : (
            <>
              <div className="dl-panel-title">On the mound</div>
              <p className="dl-gd-note">{prompt?.kind === 'pitch-prompt' ? 'Waiting on your opponent…' : 'Playing out automatically.'}</p>
            </>
          )}
        </div>
      )}

      {tab === 'field' && (
        <div className="dl-panel">
          <div className="dl-panel-title">Defensive Alignment</div>
          <div className="dl-gd-opt-grid dl-gd-opt-grid-3">
            {ALIGNMENT_KEYS.map(k => (
              <button key={k} className={`dl-gd-opt-btn ${alignment === k ? 'selected' : ''}`} onClick={() => setAlignment(k)}>{ALIGN_META[k].label}</button>
            ))}
          </div>
          <p className="dl-gd-note">Takes effect on your next pitch on the mound.</p>
          <div className="dl-gd-section-title" style={{ marginTop: 14 }}>Positioning</div>
          <FieldCard bases={bases} outs={live.outs} tall showFielders />
        </div>
      )}

      {tab === 'strategy' && (
        <div className="dl-panel">
          <div className="dl-panel-title">Strategy Desk</div>
          {prompt?.kind === 'steal-prompt' && myTurn ? (
            <StealPrompt prompt={prompt} careerPlayer={prompt.runner} aggressive={aggressive} setAggressive={setAggressive} onRespond={submit} />
          ) : (
            <p className="dl-gd-note">
              {prompt?.kind === 'steal-prompt' ? "Waiting on your opponent's baserunning call…" : "No baserunning decision right now."}
            </p>
          )}
          <div className="dl-gd-section-title" style={{ marginTop: 14 }}>Your Approach (for your next at-bat)</div>
          <div className="dl-gd-opt-grid">
            {APPROACH_KEYS.map(k => (
              <button key={k} className={`dl-gd-opt-btn ${approach === k ? 'selected' : ''}`} onClick={() => setApproach(k)}>
                {APPROACH_META[k].label}<span className="sub">{APPROACH_META[k].sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="dl-panel">
          <div className="dl-panel-title">Recent Plays</div>
          <div className="dl-gd-timeline">
            {(log || []).slice().reverse().map((e, i) => (
              <div key={i} className={`dl-gd-tl-item ${e.type === 'final' ? 'hl' : ''}`}>
                <div className="tl-inn">{e.top ? 'T' : 'B'}{e.inning || ''}</div>
                <div className="tl-text">{e.text}</div>
              </div>
            ))}
            {(!log || log.length === 0) && <div className="dl-empty">No plays yet.</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <button className="dl-btn dl-btn-sm dl-btn-ghost" onClick={onExit}>Leave Game</button>
      </div>
    </div>
  );
}
