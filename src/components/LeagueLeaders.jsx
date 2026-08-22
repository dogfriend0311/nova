import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { SPORTS, SPORT_ORDER } from '../data/sportsConfig';

// ── League Leaders ───────────────────────────────────────────
// A compact "who's on top right now" strip for Home — one headline
// scoring stat per Roblox league, pulled straight from season stats
// that are already entered on player pages. This deliberately doesn't
// replace the League Record Book (season/career/single-game marks for
// every stat) — it's a teaser so leaders are visible without digging
// into a league's Records tab first.

// The single "top scorer" stat to headline per league.
const HEADLINE_STAT = {
  vizta:    { label: 'Home Runs', field: 'season_home_runs' },
  hockey:   { label: 'Goals',     field: 'season_goals' },
  football: { label: 'Total TDs', field: 'season_total_td' },
};

const getPlayerLabel = (player) => player?.nickname || player?.player_name || 'Unknown player';

const goTo = (hash) => { window.location.hash = hash; };

const LeagueLeaders = () => {
  const [leaders, setLeaders] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      SPORT_ORDER.map((lg) =>
        db.getPlayers(lg).then((players) => {
          const stat = HEADLINE_STAT[lg];
          const top = (players || [])
            .map((p) => ({ player: p, value: parseFloat(p[stat.field]) }))
            .filter((row) => Number.isFinite(row.value) && row.value > 0)
            .sort((a, b) => b.value - a.value)[0];
          return top ? { league: lg, stat, top } : null;
        }).catch(() => null)
      )
    ).then((rows) => {
      if (cancelled) return;
      setLeaders(rows.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, []);

  if (leaders === null) return null; // avoid flashing an empty section
  if (leaders.length === 0) return null;

  return (
    <>
      <div className="home-section-label">League Leaders</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 8 }}>
        {leaders.map(({ league, stat, top }) => (
          <button
            key={league}
            onClick={() => goTo(`#leagues/player/${top.player.id}`)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left',
              background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)',
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(158,165,196,0.45)' }}>
              {SPORTS[league]?.icon} {SPORTS[league]?.shortLabel} · {stat.label} Leader
            </span>
            <span style={{ color: '#e2e5f0', fontSize: '0.95rem', fontWeight: 700 }}>{getPlayerLabel(top.player)}</span>
            <span style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              {Math.round(top.value).toLocaleString()} {stat.label.toLowerCase()}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};

export default LeagueLeaders;
