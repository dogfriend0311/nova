import React, { useEffect, useState } from 'react';
import { SPORTS } from '../data/sportsConfig';
import { useAuth } from '../context/AuthContext';

// ── Continue Where You Left Off ─────────────────────────────
// Reads the two small localStorage breadcrumbs already being written
// elsewhere (FantasyHub.openLeague and LeaguesPage's setLeague wrapper)
// and turns them into one-click "continue" tiles on Home. Per-device
// by nature (localStorage), which is fine here — it's a shortcut back
// to what YOU were just doing, not shared state.

const ContinueTiles = () => {
  const { user } = useAuth();
  const [lastLeague, setLastLeague] = useState(null); // real sports league (vizta/hockey/football)
  const [lastFantasy, setLastFantasy] = useState(null); // fantasy league

  useEffect(() => {
    try {
      const sport = localStorage.getItem('nova_last_league_sport');
      if (sport && SPORTS[sport]) setLastLeague(sport);
    } catch {}
    if (user?.username) {
      try {
        const raw = localStorage.getItem(`nova_last_fantasy_league_${user.username}`);
        if (raw) setLastFantasy(JSON.parse(raw));
      } catch {}
    }
  }, [user]);

  if (!lastLeague && !lastFantasy) return null;

  return (
    <>
      <div className="home-section-label">Continue Where You Left Off</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
        {lastFantasy && (
          <button
            onClick={() => { window.location.hash = 'fantasy'; }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
              background: 'rgba(255,158,87,0.06)', border: '1px solid rgba(255,158,87,0.2)',
              borderRadius: 10, padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>🏈</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(158,165,196,0.45)' }}>Jump back into</div>
              <div style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastFantasy.name || 'Your fantasy team'}</div>
            </div>
          </button>
        )}
        {lastLeague && (
          <button
            onClick={() => { window.location.hash = 'leagues'; }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
              background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)',
              borderRadius: 10, padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{SPORTS[lastLeague]?.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(158,165,196,0.45)' }}>Back to</div>
              <div style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.9rem' }}>{SPORTS[lastLeague]?.label || SPORTS[lastLeague]?.shortLabel}</div>
            </div>
          </button>
        )}
      </div>
    </>
  );
};

export default ContinueTiles;
