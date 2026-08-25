import React from 'react';

// ── Development Arc Chart ───────────────────────────────────────
// A small, dependency-free SVG line chart for a single stat trending
// over a series of points (games or seasons). Mirrors RadarChart.jsx's
// approach — plain SVG, no charting library, colors passed in as props
// so it can be re-themed per league accent color.
//
// Props:
//   points: [{ label, value }]  — chronological, oldest first
//   color, height, width        — display options
//   emptyMessage                — shown instead of the chart when
//                                  points.length < 2

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const DevelopmentArcChart = ({
  points = [],
  color = '#5e81f4',
  width = 640,
  height = 220,
  emptyMessage = 'Not enough data points yet to plot a trend.',
}) => {
  if (!points || points.length < 2) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height, color: 'rgba(158,165,196,0.45)', fontSize: '0.85rem',
        border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12,
      }}>
        {emptyMessage}
      </div>
    );
  }

  const padL = 40, padR = 16, padT = 16, padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; } // avoid a zero-range axis
  const range = max - min;
  // pad the value axis 10% so the line never touches the top/bottom edge
  const padValue = range * 0.1;
  min -= padValue; max += padValue;

  const xFor = (i) => padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(points.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  // Show every label if there's room, otherwise thin them out so they
  // don't overlap on a long game log.
  const maxLabels = Math.max(2, Math.floor(plotW / 55));
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block', maxWidth: width }}>
      {gridLines.map((frac) => {
        const y = padT + plotH * frac;
        const value = max - (max - min) * frac;
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(158,165,196,0.1)" strokeWidth="1" />
            <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="rgba(158,165,196,0.5)">
              {Number.isInteger(value) ? value : value.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill={color} fillOpacity="0.12" stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xFor(i)} cy={clamp(yFor(p.value), padT, padT + plotH)} r="3.5" fill={color} stroke="rgba(10,12,20,0.6)" strokeWidth="1.5">
          <title>{`${p.label}: ${p.value}`}</title>
        </circle>
      ))}
      {points.map((p, i) => (
        i % labelStep === 0 || i === points.length - 1 ? (
          <text key={`lbl-${i}`} x={xFor(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="rgba(158,165,196,0.55)">
            {p.label}
          </text>
        ) : null
      ))}
    </svg>
  );
};

export default DevelopmentArcChart;
