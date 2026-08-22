import React from 'react';

// ── Radar Chart ───────────────────────────────────────────────
// A small, dependency-free SVG spider chart for comparing two
// entities (players, teams, whatever) across a shared set of stat
// axes. Each axis is normalized against a caller-supplied `max` —
// typically the league-wide max for that stat — since raw stats live
// on wildly different scales (batting average 0-1 vs home runs 0-50).
// Normalizing against the league max (rather than just the two values
// being compared) means the chart also communicates how good each
// player is in absolute terms, not just relative to their opponent.
//
// Props:
//   axes: [{ label, a, b, max, lowerBetter }]
//     a, b        — the two raw values being compared
//     max         — the reference ceiling for this stat (e.g. league max)
//     lowerBetter — true for stats where smaller is better (ERA, etc.)
//   colorA, colorB, nameA, nameB, size (px, square) — display options

const toRad = (deg) => (deg * Math.PI) / 180;
const clamp01 = (n) => Math.max(0, Math.min(1, n));

const normalize = (value, max, lowerBetter) => {
  const v = Number.isFinite(value) ? value : 0;
  const m = Number.isFinite(max) && max > 0 ? max : 1;
  return lowerBetter ? clamp01(1 - v / m) : clamp01(v / m);
};

const RadarChart = ({ axes, colorA = '#5e81f4', colorB = '#ff9e57', nameA = 'A', nameB = 'B', size = 260 }) => {
  if (!axes || axes.length < 3) return null; // needs 3+ axes to read as a shape

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const n = axes.length;
  const angleStep = 360 / n;

  const pointFor = (i, frac) => {
    const angle = toRad(-90 + i * angleStep); // start at 12 o'clock, go clockwise
    return [cx + Math.cos(angle) * radius * frac, cy + Math.sin(angle) * radius * frac];
  };

  const ringFracs = [0.25, 0.5, 0.75, 1];

  const seriesPoints = (key) => axes
    .map((ax, i) => pointFor(i, normalize(ax[key], ax.max, ax.lowerBetter)))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
        {ringFracs.map((frac) => (
          <polygon
            key={frac}
            points={axes.map((_, i) => pointFor(i, frac).join(',')).join(' ')}
            fill="none"
            stroke="rgba(158,165,196,0.15)"
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pointFor(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(158,165,196,0.15)" strokeWidth="1" />;
        })}
        {axes.map((ax, i) => {
          const [x, y] = pointFor(i, 1.2);
          return (
            <text
              key={ax.label}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.04}
              fill="rgba(158,165,196,0.65)"
            >
              {ax.label}
            </text>
          );
        })}
        {/* series B drawn first so A sits on top when they overlap */}
        <polygon points={seriesPoints('b')} fill={colorB} fillOpacity="0.18" stroke={colorB} strokeWidth="2" />
        <polygon points={seriesPoints('a')} fill={colorA} fillOpacity="0.18" stroke={colorA} strokeWidth="2" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        <span style={{ fontSize: '0.75rem', color: colorA }}>&#9679; {nameA}</span>
        <span style={{ fontSize: '0.75rem', color: colorB }}>&#9679; {nameB}</span>
      </div>
    </div>
  );
};

export default RadarChart;
