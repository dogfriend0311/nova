import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { computeVsFieldStats } from '../services/percentileService';

const fmtStat = (value, fmt) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '—';
  if (fmt === 'avg3') return n.toFixed(3);
  if (fmt === 'avg2') return n.toFixed(2);
  if (fmt === 'avg1') return n.toFixed(1);
  return Math.round(n).toLocaleString();
};

const pctColor = (p) => {
  if (p >= 70) return '#5e81f4';
  if (p >= 30) return '#ffd700';
  return '#ff6b7a';
};

const PercentileRow = ({ row, groupLabel }) => {
  const color = pctColor(row.percentile);
  return (
    <div className="sv-bar-item">
      <div className="sv-bar-header">
        <span className="sv-bar-label">{row.label}</span>
        <span className="sv-bar-val" style={{ color }}>{fmtStat(row.value, row.fmt)}</span>
      </div>
      <div className="sv-bar-track">
        <div className="sv-bar-fill" style={{ width: `${row.percentile}%`, background: color }} />
      </div>
      <span className="sv-bar-pct sv-bar-pct-sentence" style={{ color }}>
        Better than {row.percentile}% of qualified {groupLabel} this season
      </span>
    </div>
  );
};

// "Vs. the Field" — shows a player's season stats next to a live percentile
// bar computed against every other qualified player in the same league this
// season, e.g. "Better than 82% of qualified Hitting players this season."
// Works for any sport in sportsConfig since it reads leadersA/leadersB off
// the passed-in cfg rather than hardcoding stat names.
const VsFieldCard = ({ player, sport, cfg }) => {
  const [allPlayers, setAllPlayers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.getPlayers(sport).then(list => { if (!cancelled) setAllPlayers(Array.isArray(list) ? list : []); });
    return () => { cancelled = true; };
  }, [sport]);

  if (!player || !cfg || allPlayers === null) return null;

  const { A, B } = computeVsFieldStats(player, allPlayers, cfg);
  if (A.length === 0 && B.length === 0) return null;

  return (
    <div className="savant-card neon-card">
      <div className="sv-header">
        <h3 className="gradient-text-cyan">Vs. The Field</h3>
        <span className="sv-subtitle">Percentile Rankings · {cfg.label}</span>
      </div>
      <div className="sv-legend">
        <span style={{ color: '#ff6b7a' }}>POOR</span>
        <span style={{ color: '#ffd700' }}>AVERAGE</span>
        <span style={{ color: '#5e81f4' }}>GREAT</span>
      </div>
      {A.length > 0 && (
        <>
          <div className="sv-section-label">{cfg.catA.label}</div>
          <div className="sv-bars">{A.map((row, i) => <PercentileRow key={i} row={row} groupLabel={cfg.catA.label} />)}</div>
        </>
      )}
      {B.length > 0 && (
        <>
          <div className="sv-section-label">{cfg.catB.label}</div>
          <div className="sv-bars">{B.map((row, i) => <PercentileRow key={i} row={row} groupLabel={cfg.catB.label} />)}</div>
        </>
      )}
    </div>
  );
};

export default VsFieldCard;
