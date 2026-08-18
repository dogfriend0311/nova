import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { getSport } from '../data/sportsConfig';
import { accoladeLabel, accoladeIcon } from '../data/accolades';
import './EmbedPlayerCard.css';

// ── Embeddable Stat Cards ──────────────────────────────────────
// A fully standalone, unauthenticated, chrome-free render of a single
// player's card, meant to live inside an <iframe> on Discord embeds,
// forums, or a personal site. It does NOT mount AuthProvider/Layout —
// see the check in App.jsx that renders this instead of the full app
// whenever the URL hash starts with "embed/player/".
//
// URL shape: #embed/player/<league>/<playerId>[?theme=light]

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmtStat = (v, fmt = 'int') => {
  const n = num(v);
  if (n === null) return '—';
  if (fmt === 'avg3') return n.toFixed(3).replace(/^0\./, '.');
  if (fmt === 'avg2') return n.toFixed(2);
  if (fmt === 'avg1') return n.toFixed(1);
  return Math.round(n).toLocaleString();
};

function parseEmbedHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/'); // ['embed','player', league, id]
  return { league: parts[2] || 'vizta', playerId: parts[3] || null };
}

const EmbedPlayerCard = () => {
  const [{ league, playerId }] = useState(parseEmbedHash);
  const [player, setPlayer] = useState(null);
  const [potm, setPotm] = useState([]);
  const [accolades, setAccolades] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error

  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const light = params.get('theme') === 'light';

  useEffect(() => {
    let cancelled = false;
    if (!playerId) { setStatus('notfound'); return; }
    Promise.all([
      db.getPlayers(league),
      db.getPotmAwards ? db.getPotmAwards(league, playerId).catch(() => []) : Promise.resolve([]),
      db.getAccolades ? db.getAccolades(league, playerId).catch(() => []) : Promise.resolve([]),
    ]).then(([players, potmList, accList]) => {
      if (cancelled) return;
      const found = (Array.isArray(players) ? players : []).find(p => String(p.id) === String(playerId));
      if (!found) { setStatus('notfound'); return; }
      setPlayer(found);
      setPotm(Array.isArray(potmList) ? potmList : []);
      setAccolades(Array.isArray(accList) ? accList : []);
      setStatus('ok');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [league, playerId]);

  if (status === 'loading') {
    return <div className={`epc-root epc-state ${light ? 'epc-light' : ''}`}>Loading card…</div>;
  }
  if (status === 'notfound') {
    return <div className={`epc-root epc-state ${light ? 'epc-light' : ''}`}>Player not found.</div>;
  }
  if (status === 'error') {
    return <div className={`epc-root epc-state ${light ? 'epc-light' : ''}`}>Couldn't load this card.</div>;
  }

  const cfg = getSport(league);
  const name = player.nickname || player.player_name || 'Unknown player';
  const avatar = player.avatar_data || null;

  // Pick whichever stat category (hitting/pitching, offense/defense, etc.)
  // this player actually has season numbers logged for, then show the
  // top-value leaders from that side of the sport config.
  const hasSideA = cfg.leadersA.some(s => num(player[s.seasonField]) !== null);
  const hasSideB = cfg.leadersB.some(s => num(player[s.seasonField]) !== null);
  const primaryStats = (hasSideA ? cfg.leadersA : hasSideB ? cfg.leadersB : cfg.leadersA).slice(0, 6);

  const latestPotm = potm.length ? potm[potm.length - 1] : null;

  return (
    <div className={`epc-root ${light ? 'epc-light' : ''}`} style={{ '--epc-accent': cfg.accent || '#5e81f4' }}>
      <div className="epc-card">
        <div className="epc-head">
          <div className="epc-avatar">
            {avatar ? <img src={avatar} alt={name} /> : <span>{name.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="epc-id">
            <div className="epc-name">{name}</div>
            <div className="epc-sub">
              <span>{cfg.icon} {player.team || 'Free Agent'}</span>
              {player.position && <><span className="epc-dot" />{player.position}</>}
            </div>
          </div>
          {latestPotm && <div className="epc-potm" title="Player of the Month">🏆</div>}
        </div>

        {accolades.length > 0 && (
          <div className="epc-accolades">
            {accolades.slice(0, 4).map((a, i) => (
              <span key={i} className="epc-badge">{accoladeIcon(a)} {accoladeLabel(a)}</span>
            ))}
          </div>
        )}

        <div className="epc-stats">
          {primaryStats.map(stat => (
            <div className="epc-stat" key={stat.label}>
              <span className="epc-stat-val">{fmtStat(player[stat.seasonField], stat.fmt)}</span>
              <span className="epc-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        <a
          className="epc-footer"
          href={`${window.location.origin}${window.location.pathname}#leagues/player/${player.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cfg.label} · Nova ↗
        </a>
      </div>
    </div>
  );
};

export default EmbedPlayerCard;
