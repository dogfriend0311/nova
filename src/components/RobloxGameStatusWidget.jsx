import React, { useEffect, useState } from 'react';
import db from '../services/db';

// ── Roblox game status widget ──────────────────────────────────
// Shows a live "X playing now" pill for whichever Roblox place ID(s)
// the owner configures. Owner-side control lives in OwnerDashboard's
// "Roblox Games" settings tab, which writes to the 'roblox_games'
// site setting as an array: [{ placeId, label }, ...].
// Renders nothing if no game is configured yet, so it's safe to drop
// into Home unconditionally.

const POLL_MS = 60000;

const GameChip = ({ placeId, label }) => {
  const [status, setStatus] = useState(null); // null = loading, false = failed
  const [name, setName] = useState(label);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(`/api/roblox-game-status?placeId=${encodeURIComponent(placeId)}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (data?.error) { setStatus(false); return; }
          setStatus(data.playing ?? 0);
          if (!label && data.name) setName(data.name);
        })
        .catch(() => { if (!cancelled) setStatus(false); });
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [placeId, label]);

  return (
    <a
      href={`https://www.roblox.com/games/${placeId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.15)',
        borderRadius: 12, padding: '10px 14px', minWidth: 180,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: status === false ? '#5e6580' : '#4ade80',
        boxShadow: status && status !== false ? '0 0 8px #4ade80' : 'none',
      }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e2e5f0', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name || 'Roblox Game'}
        </div>
        <div style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.72rem' }}>
          {status === null ? 'Checking…' : status === false ? 'Status unavailable' : `${status.toLocaleString()} playing now`}
        </div>
      </span>
    </a>
  );
};

const RobloxGameStatusWidget = () => {
  const [games, setGames] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    db.getSiteSetting('roblox_games').then(val => {
      if (!cancelled) setGames(Array.isArray(val) ? val.filter(g => g?.placeId) : []);
    }).catch(() => { if (!cancelled) setGames([]); });
    return () => { cancelled = true; };
  }, []);

  if (!games || games.length === 0) return null;

  return (
    <>
      <div className="home-section-label">Live Now</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        {games.map(g => <GameChip key={g.placeId} placeId={g.placeId} label={g.label} />)}
      </div>
    </>
  );
};

export default RobloxGameStatusWidget;
