import React, { useState, useEffect, useRef } from 'react';
import { simulateGame, createInteractiveGame, APPROACH_KEYS, PITCH_TYPE_KEYS, ALIGNMENT_KEYS } from '../../../services/baseball/engine';

const APPROACH_META = {
  contact: { label: 'Contact', sub: 'Shorten up, put it in play' },
  power: { label: 'Power', sub: 'Sell out for the long ball' },
  patient: { label: 'Patient', sub: 'Work the count, draw a walk' },
  bunt: { label: 'Bunt', sub: 'Drop it down, move the runner' },
};
const PITCH_META = {
  fastball: { label: '4-Seam FB' },
  slider: { label: 'Slider' },
  changeup: { label: 'Changeup' },
  curveball: { label: 'Curveball' },
};
const ALIGN_META = {
  standard: { label: 'Standard' },
  infield_in: { label: 'Infield In' },
  shift: { label: 'Shift' },
  no_doubles: { label: 'No-Doubles' },
  bunt_guard: { label: 'Bunt Guard' },
  deep: { label: 'Deep' },
};
// Corner cells demand tighter timing (higher risk/reward on location),
// the middle of the zone is the widest, most forgiving window.
const ZONE_WIDTH = [12, 20, 12, 20, 30, 20, 12, 20, 12];
const ZONE_LABEL = ['High-glove', 'High', 'High-arm', 'Glove-side', 'Middle-middle', 'Arm-side', 'Low-glove', 'Low', 'Low-arm'];

function nameOf(p) { return p ? `${p.firstName[0]}. ${p.lastName}` : ''; }
function avg(season) { return season.ab > 0 ? (season.h / season.ab).toFixed(3).replace(/^0/, '') : '—'; }
function era(season) { return season.ip > 0 ? ((season.er * 9) / season.ip).toFixed(2) : '—'; }
export { nameOf, avg, era, APPROACH_META, PITCH_META, ALIGN_META, ZONE_WIDTH, ZONE_LABEL };

export default function GameDayScreen({ home, away, careerPlayer, onDone }) {
  const interactive = !!careerPlayer;
  const genRef = useRef(null);
  const resultRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);
  const [feed, setFeed] = useState([]);
  const [prompt, setPrompt] = useState(null);
  const [live, setLive] = useState({ home: 0, away: 0, inning: 1, top: true, outs: 0, bases: [null, null, null] });
  const [tab, setTab] = useState('atbat');
  const [approach, setApproach] = useState('contact');
  const [pitchType, setPitchType] = useState('fastball');
  const [zone, setZone] = useState(4);
  const [alignment, setAlignment] = useState('standard');
  const [aggressive, setAggressive] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const startedRef = useRef(false);

  const showToast = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  };

  const appendFeed = (text, hl, inning, top) => setFeed(f => [...f.slice(-40), { text, hl, inning, top }]);

  const changeSpeed = (n) => { speedRef.current = n; setSpeed(n); };

  // ── Non-interactive path: compute once, replay every entry ──────
  useEffect(() => {
    if (interactive || startedRef.current) return;
    startedRef.current = true;
    const result = simulateGame(home, away);
    resultRef.current = result;
    let i = 0;
    const showNext = () => {
      if (i >= result.log.length) { playbackTimerRef.current = null; onDone(result); return; }
      const entry = result.log[i++];
      if (entry) {
        setLive(s => ({ ...s, inning: entry.inning || s.inning, top: entry.top ?? s.top, home: entry.score?.home ?? s.home, away: entry.score?.away ?? s.away, outs: entry.outs !== undefined ? entry.outs % 3 : s.outs }));
        appendFeed(entry.text, entry.type === 'final', entry.inning, entry.top);
      }
      const delay = speedRef.current === 1 ? 850 : 280;
      playbackTimerRef.current = setTimeout(showNext, delay);
    };
    showNext();
    return () => { if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current); playbackTimerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // ── Interactive path ──────────────────────────────────────────
  const step = (input) => {
    if (!genRef.current) genRef.current = createInteractiveGame(home, away, careerPlayer.id);
    const res = genRef.current.next(input);
    if (res.done) { onDone(res.value); return; }
    const ev = res.value;
    if (ev.kind === 'log') {
      const e = ev.entry;
      setLive(s => ({
        ...s, inning: e.inning || s.inning, top: e.top ?? s.top,
        outs: e.outs !== undefined ? e.outs % 3 : s.outs,
        home: e.score?.home ?? s.home, away: e.score?.away ?? s.away,
      }));
      appendFeed(e.text, e.type === 'final' || e.type === 'pitching-change', e.inning, e.top);
      setPrompt(null);
      playbackTimerRef.current = setTimeout(() => step(undefined), speedRef.current === 1 ? 700 : 240);
    } else {
      setPrompt(ev);
      setLive(s => ({ ...s, bases: ev.bases || s.bases, outs: ev.outs ?? s.outs }));
      if (ev.kind === 'bat-prompt') setTab('atbat');
      else if (ev.kind === 'pitch-prompt') setTab('pitch');
      else if (ev.kind === 'steal-prompt') setTab('strategy');
    }
  };

  useEffect(() => {
    if (!interactive || startedRef.current) return;
    startedRef.current = true;
    step(undefined);
    return () => { if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current); playbackTimerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const respond = (input) => step(input);

  // Swing / pitch timing resolves into an outcome then feeds the engine.
  const onSwingResult = (pct) => {
    let timing = 'take';
    if (pct !== null) {
      if (pct >= 55 && pct <= 72) timing = 'perfect';
      else if (pct >= 38 && pct <= 85) timing = 'good';
      else if (pct < 38) timing = 'early';
      else timing = 'late';
    }
    respond({ timing, approach });
  };
  const onPitchResult = (pct) => {
    const width = ZONE_WIDTH[zone];
    const accuracy = pct === null ? 0.12 : clampNum(1 - Math.abs(pct - 60) / (width + 40), 0, 1);
    respond({ accuracy, pitchType, alignment });
  };

  const bases = live.bases || [null, null, null];
  const battingTeamAbbr = live.top ? away.abbr : home.abbr;

  return (
    <div className="dl-gd">
      <div className="dl-gd-league-strip">
        <span>Diamond League · Live</span>
        <span className="dl-gd-live">{interactive ? "You're playing" : 'Simulating'}</span>
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

      {/* ── AT BAT ─────────────────────────────────────────── */}
      {tab === 'atbat' && (
        <div className="dl-panel">
          {prompt?.kind === 'bat-prompt' ? (
            <>
              <div className="dl-panel-title">You're up — {nameOf(careerPlayer)} vs {nameOf(prompt.pitcher)}</div>
              <FieldCard bases={bases} outs={live.outs} />
              <div className="dl-gd-section-title">Batter Approach</div>
              <div className="dl-gd-opt-grid">
                {APPROACH_KEYS.map(k => (
                  <button key={k} className={`dl-gd-opt-btn ${approach === k ? 'selected' : ''}`} onClick={() => setApproach(k)}>
                    {APPROACH_META[k].label}<span className="sub">{APPROACH_META[k].sub}</span>
                  </button>
                ))}
              </div>
              <MatchupCard batter={careerPlayer} pitcher={prompt.pitcher} fatigue={prompt.fatigue} pitchCount={prompt.pitchCount} staminaLimit={prompt.staminaLimit} />
              <TimingMeter actionLabel="⚡ SWING (tap / space)" onResult={onSwingResult} colorVar="--dl-amber" />
              <button className="dl-btn dl-btn-ghost dl-btn-block" onClick={() => respond({ timing: 'take', approach })}>Take Pitch</button>
            </>
          ) : (
            <>
              <div className="dl-panel-title">{battingTeamAbbr} at the plate</div>
              <FieldCard bases={bases} outs={live.outs} />
              <p className="dl-gd-note">
                {interactive ? "Not your at-bat — playing out automatically." : 'Watching the sim play out.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── PITCH ──────────────────────────────────────────── */}
      {tab === 'pitch' && (
        <div className="dl-panel">
          {prompt?.kind === 'pitch-prompt' ? (
            <>
              <div className="dl-panel-title">You're pitching — {nameOf(careerPlayer)} vs {nameOf(prompt.batter)}</div>
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
              <p className="dl-gd-note">{interactive ? "Not your pitch — playing out automatically." : 'Watching the sim play out.'}</p>
            </>
          )}
        </div>
      )}

      {/* ── FIELD ──────────────────────────────────────────── */}
      {tab === 'field' && (
        <div className="dl-panel">
          <div className="dl-panel-title">Defensive Alignment</div>
          <div className="dl-gd-opt-grid dl-gd-opt-grid-3">
            {ALIGNMENT_KEYS.map(k => (
              <button key={k} className={`dl-gd-opt-btn ${alignment === k ? 'selected' : ''}`} onClick={() => setAlignment(k)}>{ALIGN_META[k].label}</button>
            ))}
          </div>
          <p className="dl-gd-note">Takes effect on your next pitch on the mound — trades hits for extra-base risk depending on the call.</p>
          <div className="dl-gd-section-title" style={{ marginTop: 14 }}>Positioning</div>
          <FieldCard bases={bases} outs={live.outs} tall showFielders />
        </div>
      )}

      {/* ── STRATEGY ───────────────────────────────────────── */}
      {tab === 'strategy' && (
        <div className="dl-panel">
          <div className="dl-panel-title">Strategy Desk</div>
          {prompt?.kind === 'steal-prompt' ? (
            <StealPrompt prompt={prompt} careerPlayer={careerPlayer} aggressive={aggressive} setAggressive={setAggressive} onRespond={respond} />
          ) : (
            <p className="dl-gd-note">
              {interactive
                ? "No baserunning decision right now — you'll get the call here the moment you reach first with second open."
                : 'Watching the sim play out.'}
            </p>
          )}
          <div className="dl-gd-section-title" style={{ marginTop: 14 }}>Your Approach (for your next at-bat)</div>
          <div className="dl-gd-opt-grid">
            {APPROACH_KEYS.map(k => (
              <button key={k} className={`dl-gd-opt-btn ${approach === k ? 'selected' : ''}`} onClick={() => { setApproach(k); showToast(`${APPROACH_META[k].label} approach set.`); }}>
                {APPROACH_META[k].label}<span className="sub">{APPROACH_META[k].sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY ────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="dl-panel">
          <div className="dl-panel-title">Recent Plays</div>
          <div className="dl-gd-timeline">
            {feed.slice().reverse().map((l, i) => (
              <div key={i} className={`dl-gd-tl-item ${l.hl ? 'hl' : ''}`}>
                <div className="tl-inn">{l.top ? 'T' : 'B'}{l.inning || ''}</div>
                <div className="tl-text">{l.text}</div>
              </div>
            ))}
            {feed.length === 0 && <div className="dl-empty">No plays yet.</div>}
          </div>
        </div>
      )}

      {!interactive && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button className={`dl-btn dl-btn-sm ${speed === 1 ? 'dl-btn-primary' : ''}`} onClick={() => changeSpeed(1)}>1x</button>
          <button className={`dl-btn dl-btn-sm ${speed === 3 ? 'dl-btn-primary' : ''}`} onClick={() => changeSpeed(3)}>3x</button>
          <button className="dl-btn dl-btn-sm" onClick={() => {
            if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
            playbackTimerRef.current = null;
            if (resultRef.current) onDone(resultRef.current);
          }}>Skip to Result ▶▶</button>
        </div>
      )}

      <div className={`dl-gd-toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

function clampNum(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export function FieldCard({ bases, outs, tall, showFielders }) {
  return (
    <div className={`dl-gd-field-card ${tall ? 'tall' : ''}`}>
      <div className="dl-gd-mound" />
      <div className="dl-gd-diamond-big">
        <div className="base home" />
        <div className={`base first ${bases[0] ? 'occ' : ''}`} />
        <div className={`base second ${bases[1] ? 'occ' : ''}`} />
        <div className={`base third ${bases[2] ? 'occ' : ''}`} />
      </div>
      {showFielders && (
        <>
          <div className="dl-gd-fielder" style={{ left: '20%', top: '14%' }}><span className="chip" />LF</div>
          <div className="dl-gd-fielder" style={{ left: '50%', top: '4%' }}><span className="chip" />CF</div>
          <div className="dl-gd-fielder" style={{ left: '80%', top: '14%' }}><span className="chip" />RF</div>
          <div className="dl-gd-fielder" style={{ left: '32%', top: '44%' }}><span className="chip" />3B</div>
          <div className="dl-gd-fielder" style={{ left: '38%', top: '56%' }}><span className="chip" />SS</div>
          <div className="dl-gd-fielder" style={{ left: '62%', top: '56%' }}><span className="chip" />2B</div>
          <div className="dl-gd-fielder" style={{ left: '68%', top: '44%' }}><span className="chip" />1B</div>
        </>
      )}
    </div>
  );
}

export function FatigueBar({ pitchCount, staminaLimit }) {
  const pct = staminaLimit ? clampNum((pitchCount / staminaLimit) * 100, 0, 100) : 0;
  return (
    <div className="dl-gd-fatigue-row">
      <div className="dl-gd-fatigue-track"><div className="dl-gd-fatigue-fill" style={{ width: `${pct}%` }} /></div>
      <div className="dl-gd-fatigue-num">{pitchCount || 0} / {Math.round(staminaLimit || 0)} pit</div>
    </div>
  );
}

export function MatchupCard({ batter, pitcher, fatigue, pitchCount, staminaLimit }) {
  if (!batter || !pitcher) return null;
  return (
    <div className="dl-gd-matchup-card">
      <div className="dl-gd-matchup-vs">
        <div className="side"><div className="role">Batting</div><div className="who">{nameOf(batter)}</div><div className="tag">{batter.archetype}</div></div>
        <div className="x">vs</div>
        <div className="side"><div className="role">Pitching</div><div className="who">{nameOf(pitcher)}</div><div className="tag">{pitcher.archetype}</div></div>
      </div>
      <div className="dl-gd-stat-line"><span className="k">Season AVG</span><span>{avg(batter.season)}</span></div>
      <div className="dl-gd-stat-line"><span className="k">Power / Eye</span><span>{batter.ratings.power} / {batter.ratings.eye}</span></div>
      <div className="dl-gd-stat-line"><span className="k">Pitcher ERA</span><span>{era(pitcher.season)}</span></div>
      <div className="dl-gd-stat-line"><span className="k">Stuff / Control</span><span>{pitcher.ratings.stuff} / {pitcher.ratings.control}</span></div>
      <div className="dl-gd-stat-line"><span className="k">Fatigue</span><span>{Math.round((fatigue || 0) * 100)}% ({pitchCount || 0}/{Math.round(staminaLimit || 0)} pit)</span></div>
    </div>
  );
}

// A reusable tap-the-sweet-spot meter, driven by click/touch or the
// spacebar — works identically on mobile and PC.
export function TimingMeter({ durationMs = 1050, sweetLo = 55, sweetHi = 72, goodLo = 38, goodHi = 85, actionLabel, onResult, colorVar = '--dl-amber' }) {
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    doneRef.current = false;
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(100, (elapsed / durationMs) * 100);
      setPct(p);
      if (p >= 100 && !doneRef.current) { doneRef.current = true; clearInterval(id); onResult(null); }
    }, 16);
    const onKey = (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweetLo, sweetHi]);

  const tap = () => { if (doneRef.current) return; doneRef.current = true; onResult(pct); };

  return (
    <div className="dl-gd-meter-wrap">
      <div className="dl-gd-meter">
        <div className="good" style={{ left: `${goodLo}%`, width: `${goodHi - goodLo}%` }} />
        <div className="sweet" style={{ left: `${sweetLo}%`, width: `${sweetHi - sweetLo}%` }} />
        <div className="cursor" style={{ left: `calc(${pct}% - 2px)` }} />
      </div>
      <button className="dl-btn dl-btn-primary dl-btn-block" style={{ marginTop: 10 }} onClick={tap}>{actionLabel}</button>
    </div>
  );
}

export function StealPrompt({ prompt, careerPlayer, aggressive, setAggressive, onRespond }) {
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(100, (elapsed / 2200) * 100);
      setPct(p);
      if (p >= 100 && !doneRef.current) { doneRef.current = true; clearInterval(id); onRespond({ attempt: false }); }
    }, 16);
    const onKey = (e) => { if (e.key === 's' || e.key === 'S') { e.preventDefault(); go(); } };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = () => { if (doneRef.current) return; doneRef.current = true; onRespond({ attempt: true, aggressive }); };
  const stay = () => { if (doneRef.current) return; doneRef.current = true; onRespond({ attempt: false }); };
  return (
    <div>
      <div className="dl-gd-note" style={{ marginBottom: 8 }}>{nameOf(careerPlayer)} takes a lead off first against {nameOf(prompt.pitcher)}...</div>
      <div className="dl-bar-track"><div className="dl-bar-fill" style={{ width: `${100 - pct}%`, background: 'var(--dl-clay)' }} /></div>
      <button className={`dl-gd-opt-btn ${aggressive ? 'selected' : ''}`} style={{ marginTop: 8, width: '100%' }} onClick={() => setAggressive(a => !a)}>
        Aggressive Jump<span className="sub">Better odds if you go, worse if you're caught</span>
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="dl-btn dl-btn-primary" style={{ flex: 1 }} onClick={go}>🏃 Steal! (tap / S)</button>
        <button className="dl-btn dl-btn-ghost" style={{ flex: 1 }} onClick={stay}>Stay put</button>
      </div>
    </div>
  );
}
