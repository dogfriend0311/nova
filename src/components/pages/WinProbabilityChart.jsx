/**
 * WinProbabilityChart.jsx
 * Live win-probability graph for a Sports Hub game — a line chart that
 * updates as the game progresses, built from the same ESPN summary
 * endpoint the box score / play-by-play already use (data.winprobability:
 * an array of { homeWinPercentage, secondsLeft, ... } samples, one per
 * play). Not every sport/game carries this array (it's most reliably
 * present for NFL/NBA/NHL/CFB; MLB/CBB frequently omit it) — when it's
 * missing we say so rather than fabricate a probability.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const ESPN       = 'https://site.api.espn.com';
const ESPN_PROXY = '/espn-proxy';

const cacheKey = (sport, eventId) => `nova_winprob_cache_${sport}_${eventId}`;
const readCache = (key) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const writeCache = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
};

const WinProbabilityChart = ({ sport, eventId, homeAbbr, awayAbbr, isFinal }) => {
  const [points, setPoints]   = useState(null); // null = loading
  const [error, setError]     = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const intervalRef = useRef(null);
  const key = cacheKey(sport, eventId);

  const fetchData = useCallback(async () => {
    if (isFinal) {
      const cached = readCache(key);
      if (cached) { setPoints(cached); setFromCache(true); return; }
    }
    try {
      const apiBase = process.env.NODE_ENV === 'production' ? ESPN_PROXY : ESPN;
      const r = await fetch(`${apiBase}/apis/site/v2/sports/${sport === 'nfl' ? 'football/nfl' : sport === 'nba' ? 'basketball/nba' : sport === 'nhl' ? 'hockey/nhl' : sport === 'cfb' ? 'football/college-football' : sport === 'mlb' ? 'baseball/mlb' : 'baseball/college-baseball'}/summary?event=${eventId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const raw = Array.isArray(d.winprobability) ? d.winprobability : [];
      const parsed = raw
        .filter(p => typeof p.homeWinPercentage === 'number')
        .map((p, i) => ({ i, home: p.homeWinPercentage, play: p.playId ?? i }));
      setPoints(parsed);
      setFromCache(false);
      if (parsed.length) writeCache(key, parsed);
    } catch (e) {
      const cached = readCache(key);
      if (cached) { setPoints(cached); setFromCache(true); }
      else setError(e.message);
    }
  }, [sport, eventId, isFinal, key]);

  useEffect(() => {
    fetchData();
    if (!isFinal) {
      intervalRef.current = setInterval(fetchData, 20000);
      return () => clearInterval(intervalRef.current);
    }
  }, [fetchData, isFinal]);

  if (error) return <div className="sh-error">Could not load win probability: {error}</div>;
  if (points === null) return <div className="sh-loading" style={{ marginTop: 20 }}><div className="sh-spinner" /></div>;
  if (!points.length) return (
    <div className="sh-empty">Win probability isn't available for this game{sport === 'mlb' || sport === 'cbb' ? ' — ESPN publishes it inconsistently for baseball' : ''}.</div>
  );

  const W = 720, H = 220, PAD = 28;
  const innerW = W - PAD * 2, innerH = H - PAD * 2;
  const xFor = (i) => PAD + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const yFor = (home) => PAD + (1 - home) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.home).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(points.length - 1).toFixed(1)} ${PAD + innerH} L ${xFor(0).toFixed(1)} ${PAD + innerH} Z`;

  const latest = points[points.length - 1];
  const latestPct = Math.round(latest.home * 100);
  const leader = latestPct >= 50 ? homeAbbr : awayAbbr;
  const leaderPct = latestPct >= 50 ? latestPct : 100 - latestPct;

  return (
    <div>
      {fromCache && (
        <div style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: '8px', padding: '8px 14px', marginBottom: '14px', fontSize: '0.8rem', color: '#ffcc00' }}>
          Showing cached data for this completed game.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {awayAbbr} at {homeAbbr}
        </span>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-cyan)' }}>
          {leader} {leaderPct}% {isFinal ? 'won' : 'to win'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="wp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(94,129,244,0.35)" />
            <stop offset="100%" stopColor="rgba(94,129,244,0.02)" />
          </linearGradient>
        </defs>
        {/* 50% baseline */}
        <line x1={PAD} y1={PAD + innerH / 2} x2={W - PAD} y2={PAD + innerH / 2} stroke="rgba(158,165,196,0.2)" strokeWidth="1" strokeDasharray="4 3" />
        <text x={PAD} y={PAD + innerH / 2 - 5} fill="rgba(158,165,196,0.35)" fontSize="9">50/50</text>
        <text x={PAD} y={PAD - 8} fill="rgba(158,165,196,0.35)" fontSize="9">{homeAbbr} favored</text>
        <text x={PAD} y={H - 6} fill="rgba(158,165,196,0.35)" fontSize="9">{awayAbbr} favored</text>
        <path d={areaPath} fill="url(#wp-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="#5e81f4" strokeWidth="2" />
        <circle cx={xFor(points.length - 1)} cy={yFor(latest.home)} r="4" fill="#5e81f4" stroke="#0a0a1e" strokeWidth="1.5" />
      </svg>
      {!isFinal && <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.35)', textAlign: 'right' }}>Auto-refreshes every 20s</div>}
    </div>
  );
};

export default WinProbabilityChart;
