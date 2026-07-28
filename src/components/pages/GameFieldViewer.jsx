import React, { useState, useEffect, useRef } from 'react';

/**
 * GameFieldViewer.jsx — a stylized, tilted "diorama" field view that plays
 * back a simulated game's play-by-play log one at-bat at a time, Retro
 * Bowl style: bold flat colors, thick black outlines, chunky blocked
 * player markers, and a punchy animated ball flight per outcome.
 *
 * This is a pure-CSS/canvas-free "2.5D" presentation (a normalized field
 * tilted with a CSS 3D transform) rather than a true WebGL 3D engine —
 * which keeps it dependency-free and fast, and is honestly closer to how
 * Retro Bowl itself actually renders its field.
 *
 * It does not attempt to reconstruct exact base-runner state per play
 * (the underlying sim doesn't persist that), so it plays back each
 * outcome as its own animated moment rather than a fully continuous
 * live-scoreboard simulation.
 */

const OUTCOME_META = {
  K:   { label: 'STRIKEOUT',   color: '#ff6b7a', kind: 'whiff' },
  OUT: { label: 'OUT',         color: '#9aa3c2', kind: 'groundout' },
  BB:  { label: 'WALK',        color: '#43b581', kind: 'walk' },
  HBP: { label: 'HIT BY PITCH',color: '#f5a623', kind: 'walk' },
  '1B':{ label: 'SINGLE',      color: '#5e81f4', kind: 'hit', dist: 0.32, height: 0.10 },
  '2B':{ label: 'DOUBLE',      color: '#5e81f4', kind: 'hit', dist: 0.55, height: 0.16 },
  '3B':{ label: 'TRIPLE',      color: '#5e81f4', kind: 'hit', dist: 0.78, height: 0.20 },
  HR:  { label: 'HOME RUN!',   color: '#ffd166', kind: 'homerun', dist: 1.0, height: 0.34 },
};

// Normalized 0-100 field points (same convention as franchiseEngine's
// FIELD_POSITIONS/BASE_POSITIONS — home plate at 50,92).
const MOUND  = { x: 50, y: 62 };
const PLATE  = { x: 50, y: 92 };
const OUT_TARGETS = [
  { x: 25, y: 25 }, { x: 38, y: 16 }, { x: 50, y: 10 }, { x: 62, y: 16 }, { x: 75, y: 25 },
];
const GROUND_TARGETS = [
  { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 68, y: 68 }, { x: 32, y: 68 },
];

function lerp(a, b, t) { return a + (b - a) * t; }

/** Computes the ball's {x,y,lift} at animation progress t (0-1) for a given outcome kind. */
function ballPositionAt(kind, meta, seedTarget, t) {
  // Phase A (0 → 0.35): pitch, mound → plate
  if (t < 0.35) {
    const p = t / 0.35;
    return { x: lerp(MOUND.x, PLATE.x, p), y: lerp(MOUND.y, PLATE.y, p), lift: 0 };
  }
  const p = (t - 0.35) / 0.65;
  if (kind === 'walk') {
    // ball just drifts slightly off the plate and stops — no real "hit"
    return { x: PLATE.x + 6, y: PLATE.y - 2, lift: 0 };
  }
  if (kind === 'whiff') {
    return { x: PLATE.x, y: PLATE.y - 1, lift: 0 };
  }
  if (kind === 'groundout') {
    const target = seedTarget || GROUND_TARGETS[0];
    return { x: lerp(PLATE.x, target.x, p), y: lerp(PLATE.y, target.y, p), lift: 0 };
  }
  // hit / homerun — arcing flight to an outfield spot
  const target = seedTarget || OUT_TARGETS[2];
  const arc = Math.sin(Math.PI * p) * (meta.height || 0.2) * 100;
  return { x: lerp(PLATE.x, target.x, p), y: lerp(PLATE.y, target.y, p), lift: arc };
}

const PlayerDot = ({ x, y, color, label }) => (
  <div style={{
    position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
    width: 20, height: 20, borderRadius: '50%', background: color,
    border: '3px solid #12142a', boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.55rem', fontWeight: 900, color: '#12142a', zIndex: 2,
  }}>
    {label}
  </div>
);

const RetroField = ({ homeColor, awayColor, ball, outcomeKind }) => (
  <div style={{ perspective: 900 }}>
    <div style={{
      position: 'relative', width: '100%', paddingTop: '78%',
      transform: 'rotateX(48deg)', transformOrigin: '50% 100%',
      background: 'linear-gradient(180deg, #2f9e46 0%, #268239 60%, #1f6b30 100%)',
      border: '4px solid #12142a', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* Foul lines */}
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <polygon points="50,92 5,30 95,30" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.85" />
          {/* Infield dirt diamond */}
          <polygon points="50,92 68,68 50,48 32,68" fill="#a9724a" stroke="#12142a" strokeWidth="1" />
          {/* Pitcher's mound */}
          <circle cx="50" cy="62" r="3.2" fill="#8a5c3a" stroke="#12142a" strokeWidth="0.8" />
          {/* Bases */}
          {[{ x: 68, y: 68 }, { x: 50, y: 48 }, { x: 32, y: 68 }].map((b, i) => (
            <rect key={i} x={b.x - 2.2} y={b.y - 2.2} width="4.4" height="4.4" fill="#f5d76e" stroke="#12142a" strokeWidth="0.7" transform={`rotate(45 ${b.x} ${b.y})`} />
          ))}
          <rect x="47.5" y="89.5" width="5" height="5" fill="#f5f5f5" stroke="#12142a" strokeWidth="0.7" />
        </svg>

        {/* Fielders (decorative, fixed positions) */}
        <PlayerDot x={50} y={62} color={awayColor} label="P" />
        <PlayerDot x={50} y={90} color={awayColor} label="C" />
        <PlayerDot x={68} y={68} color={awayColor} label="1" />
        <PlayerDot x={58} y={50} color={awayColor} label="2" />
        <PlayerDot x={32} y={68} color={awayColor} label="3" />
        <PlayerDot x={42} y={50} color={awayColor} label="S" />
        <PlayerDot x={25} y={26} color={awayColor} label="L" />
        <PlayerDot x={50} y={12} color={awayColor} label="C" />
        <PlayerDot x={75} y={26} color={awayColor} label="R" />
        {/* Batter */}
        <PlayerDot x={46} y={93} color={homeColor} label="B" />

        {/* Ball */}
        <div style={{
          position: 'absolute', left: `${ball.x}%`, top: `${ball.y}%`,
          transform: `translate(-50%,-50%) translateY(${-ball.lift}%)`,
          width: 9, height: 9, borderRadius: '50%', background: '#fff',
          border: '2px solid #12142a', zIndex: 5,
          boxShadow: outcomeKind === 'homerun' ? '0 0 14px 4px rgba(255,209,102,0.8)' : '0 2px 3px rgba(0,0,0,0.4)',
          transition: 'none',
        }} />
      </div>
    </div>
  </div>
);

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(8,9,20,0.82)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16,
};
const modalStyle = {
  width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto',
  background: '#12142a', border: '1px solid rgba(94,129,244,0.25)', borderRadius: 16,
  padding: '18px 18px 20px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
};

const GameFieldViewer = ({ game, homeTeam, awayTeam, onClose }) => {
  const plays = game?.play_by_play || [];
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [ball, setBall] = useState({ x: MOUND.x, y: MOUND.y, lift: 0 });
  const seedRef = useRef(null);
  const rafRef = useRef(null);

  const current = plays[idx];
  const meta = current ? (OUTCOME_META[current.outcome] || OUTCOME_META.OUT) : null;
  const isLast = idx >= plays.length - 1;
  const homeColor = homeTeam?.primary_color || '#5e81f4';
  const awayColor = awayTeam?.primary_color || '#f5a623';

  // Animate the ball for the current play
  useEffect(() => {
    if (!current || !meta) return;
    if (meta.kind === 'groundout') seedRef.current = GROUND_TARGETS[Math.floor(Math.random() * GROUND_TARGETS.length)];
    else if (meta.kind === 'hit' || meta.kind === 'homerun') seedRef.current = OUT_TARGETS[Math.floor(Math.random() * OUT_TARGETS.length)];
    else seedRef.current = null;

    let start = null;
    const duration = 1300 / speed;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      setBall(ballPositionAt(meta.kind, meta, seedRef.current, t));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Auto-advance
  useEffect(() => {
    if (!playing || isLast || !current) return;
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, plays.length - 1)), 2000 / speed);
    return () => clearTimeout(t);
  }, [idx, playing, isLast, plays.length, speed, current]);

  if (!plays.length) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <p style={{ color: 'rgba(158,165,196,0.5)', textAlign: 'center' }}>No play-by-play saved for this game.</p>
          <div style={{ textAlign: 'center' }}>
            <button className="neon-button" onClick={onClose} style={{ marginTop: 12 }}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 900, color: '#e2e5f0' }}>
            <span style={{ color: awayColor }}>{awayTeam?.city} {awayTeam?.name}</span>
            {' '}<span style={{ color: 'rgba(158,165,196,0.4)' }}>at</span>{' '}
            <span style={{ color: homeColor }}>{homeTeam?.city} {homeTeam?.name}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.5)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.45)', textTransform: 'uppercase' }}>{awayTeam?.abbreviation || 'AWAY'}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#e2e5f0' }}>{isLast ? game.away_score : '–'}</div>
          </div>
          <div style={{ textAlign: 'center', alignSelf: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.5)' }}>
              {current ? `${current.half === 'top' ? '▲' : '▼'} Inning ${current.inning}` : ''}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.35)' }}>Play {idx + 1} / {plays.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.45)', textTransform: 'uppercase' }}>{homeTeam?.abbreviation || 'HOME'}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#e2e5f0' }}>{isLast ? game.home_score : '–'}</div>
          </div>
        </div>

        <RetroField homeColor={homeColor} awayColor={awayColor} ball={ball} outcomeKind={meta?.kind} />

        {current && (
          <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
            <div style={{ fontSize: '0.85rem', color: '#e2e5f0', fontWeight: 700 }}>{current.batter}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '0.04em', color: meta.color }}>{meta.label}</div>
          </div>
        )}

        {isLast && (
          <div style={{ textAlign: 'center', color: '#43b581', fontWeight: 800, fontSize: '0.9rem', marginBottom: 8 }}>FINAL</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="neon-button" style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>⏮ Prev</button>
          <button className="neon-button" style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <button className="neon-button" style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            onClick={() => setIdx(i => Math.min(plays.length - 1, i + 1))} disabled={isLast}>Next ⏭</button>
          <button className="neon-button" style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 3 : 1))}>{speed}x Speed</button>
          <button className="neon-button" style={{ padding: '6px 12px', fontSize: '0.78rem', borderColor: 'rgba(94,129,244,0.4)' }}
            onClick={() => setIdx(plays.length - 1)}>Skip to End</button>
        </div>

        <div style={{ marginTop: 14, maxHeight: 120, overflowY: 'auto', background: 'rgba(94,129,244,0.05)', borderRadius: 8, padding: '8px 10px' }}>
          {plays.slice(Math.max(0, idx - 6), idx + 1).reverse().map((p, i) => {
            const m = OUTCOME_META[p.outcome] || OUTCOME_META.OUT;
            return (
              <div key={idx - i} style={{ fontSize: '0.74rem', color: i === 0 ? '#e2e5f0' : 'rgba(158,165,196,0.4)', padding: '2px 0' }}>
                {p.half === 'top' ? '▲' : '▼'}{p.inning} — {p.batter}: <span style={{ color: m.color, fontWeight: 700 }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameFieldViewer;
