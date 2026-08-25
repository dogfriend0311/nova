/**
 * OnThisDaySports.jsx
 * "On this day" for real-world pro/college sports — surfaces notable
 * finals from this same month/day in past seasons, using the same
 * ESPN scoreboard endpoint (fetchScoreboard/normalizeGame) the Scores
 * tab already uses. Distinct from src/components/OnThisDay.jsx, which
 * covers the in-league (Roblox) fantasy side of the app.
 */
import React, { useEffect, useState } from 'react';
import { fetchScoreboard, normalizeGame } from '../../services/sportsDataService';

const YEARS_BACK = 12;

const pad = (n) => String(n).padStart(2, '0');

const OnThisDaySports = ({ sport, onSelectGame }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [byYear, setByYear]   = useState([]); // [{year, games:[...]}]

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);

    const today = new Date();
    const mm = today.getMonth() + 1, dd = today.getDate();
    const thisYear = today.getFullYear();
    const years = Array.from({ length: YEARS_BACK }, (_, i) => thisYear - (i + 1));

    Promise.allSettled(
      years.map(y => fetchScoreboard(sport, `${y}-${pad(mm)}-${pad(dd)}`))
    ).then(results => {
      if (cancelled) return;
      const out = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const games = (r.value.events || []).map(normalizeGame).filter(g => g && g.status === 'post');
        if (games.length) out.push({ year: years[i], games });
      });
      setByYear(out);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sport]);

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (error)   return <div className="sh-error">Could not load past games: {error}</div>;

  const allGames = byYear.flatMap(y => y.games.map(g => ({ ...g, _year: y.year })));
  if (!allGames.length) {
    return <div className="sh-empty">No completed games found for this date in the last {YEARS_BACK} seasons.</div>;
  }

  const withMargin = allGames.map(g => {
    const h = +g.homeTeam.score, a = +g.awayTeam.score;
    return { g, margin: Math.abs(h - a), total: h + a };
  });
  const blowout = [...withMargin].sort((x, y) => y.margin - x.margin)[0];
  const thriller = [...withMargin].sort((x, y) => x.margin - y.margin)[0];
  const shootout = [...withMargin].sort((x, y) => y.total - x.total)[0];

  const todayLabel = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  const Highlight = ({ tag, color, item }) => item ? (
    <div
      onClick={() => onSelectGame?.(item.g)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(100,120,200,0.15)', borderRadius: 10, cursor: onSelectGame ? 'pointer' : 'default', marginBottom: 10 }}
    >
      <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>{tag}</span>
      <span style={{ fontSize: '0.85rem', color: 'rgba(220,230,255,0.85)' }}>
        <strong>{item.g.awayTeam.abbr} {item.g.awayTeam.score}</strong> @ <strong>{item.g.homeTeam.abbr} {item.g.homeTeam.score}</strong>
        <span style={{ color: 'rgba(158,165,196,0.45)' }}> — {item.g._year}</span>
      </span>
    </div>
  ) : null;

  return (
    <div>
      <h3 className="gradient-text-cyan" style={{ margin: '0 0 4px' }}>On This Day — {todayLabel}</h3>
      <p style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.78rem', marginTop: 0, marginBottom: 16 }}>
        Notable finals from the last {YEARS_BACK} seasons, sourced live from ESPN
      </p>

      <Highlight tag="Biggest Blowout" color="#ff6b6b" item={blowout} />
      <Highlight tag="Nail-Biter"      color="#43b581" item={thriller !== blowout ? thriller : null} />
      <Highlight tag="Shootout"        color="#ffd700" item={shootout !== blowout && shootout !== thriller ? shootout : null} />

      <h4 style={{ margin: '20px 0 10px', fontSize: '0.82rem', color: 'rgba(158,165,196,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        All games on this date
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...byYear].sort((a, b) => b.year - a.year).map(({ year, games }) => (
          <div key={year} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-cyan)', minWidth: 42 }}>{year}</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(220,230,255,0.75)' }}>
              {games.map((g, i) => (
                <span
                  key={g.id}
                  onClick={() => onSelectGame?.(g)}
                  style={{ cursor: onSelectGame ? 'pointer' : 'default', marginRight: 14 }}
                >
                  {g.awayTeam.abbr} {g.awayTeam.score} @ {g.homeTeam.abbr} {g.homeTeam.score}{i < games.length - 1 ? '' : ''}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnThisDaySports;
