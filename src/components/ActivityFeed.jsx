import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { SPORTS } from '../data/sportsConfig';
import { accoladeLabel, accoladeIcon } from '../data/accolades';

// ── Activity Feed ────────────────────────────────────────────
// A public "what's happening" feed for Home, built entirely from data
// that's already visible elsewhere on the site (articles, POTM awards,
// season accolades, Hall of Fame inductions) — it deliberately does NOT
// pull from the admin audit log (db.getAuditLog), which is intentionally
// owner/cofounder-only in OwnerDashboard and shouldn't leak to the
// public homepage.

const LEAGUE_KEYS = Object.keys(SPORTS);

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const goTo = (hash) => { window.location.hash = hash; };

const ActivityFeed = () => {
  const [items, setItems] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.getArticles().catch(() => []),
      ...LEAGUE_KEYS.map(lg => db.getPotmAwards(lg).then(list => (list || []).map(a => ({ ...a, _league: lg }))).catch(() => [])),
      ...LEAGUE_KEYS.map(lg => db.getAccolades(lg).then(list => (list || []).map(a => ({ ...a, _league: lg }))).catch(() => [])),
      ...LEAGUE_KEYS.map(lg => db.getHof(lg).then(list => (list || []).map(h => ({ ...h, _league: lg }))).catch(() => [])),
    ]).then(([articles, potmA, potmB, potmC, accA, accB, accC, hofA, hofB, hofC]) => {
      if (cancelled) return;
      const feed = [
        ...articles.slice(0, 5).map(a => ({
          kind: 'article', ts: a.created_at, key: `article-${a.id}`,
          icon: '📰', title: a.title, meta: a.author ? `By ${a.author}` : 'New article',
          onClick: () => goTo(`#articles/${a.id}`),
        })),
        ...[...potmA, ...potmB, ...potmC].map(a => ({
          kind: 'potm', ts: a.created_at, key: `potm-${a.id}`,
          icon: '🏆', title: `${a.player_name || 'A player'} won Player of the Month`,
          meta: `${SPORTS[a._league]?.shortLabel || a._league}${a.month_label ? ` · ${a.month_label}` : ''}`,
          onClick: () => goTo(`#leagues/player/${a.player_id}`),
        })),
        ...[...accA, ...accB, ...accC].map(a => ({
          kind: 'accolade', ts: a.created_at, key: `acc-${a.id}`,
          icon: accoladeIcon(a), title: `${a.player_name || 'A player'} earned ${accoladeLabel(a)}`,
          meta: SPORTS[a._league]?.shortLabel || a._league,
          onClick: () => goTo(`#leagues/player/${a.player_id}`),
        })),
        ...[...hofA, ...hofB, ...hofC].map(h => ({
          kind: 'hof', ts: h.created_at, key: `hof-${h.id}`,
          icon: '⭐', title: `${h.player_name || 'A legend'} inducted into the Hall of Fame`,
          meta: SPORTS[h._league]?.shortLabel || h._league,
          onClick: () => goTo(`#leagues/player/${h.player_id}`),
        })),
      ]
        .filter(i => i.ts)
        .sort((a, b) => new Date(b.ts) - new Date(a.ts))
        .slice(0, 8);
      setItems(feed);
    });
    return () => { cancelled = true; };
  }, []);

  if (items === null) return null; // don't flash an empty section while loading
  if (items.length === 0) return null;

  return (
    <>
      <div className="home-section-label">Recent Activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {items.map(item => (
          <button
            key={item.key}
            onClick={item.onClick}
            disabled={!item.onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)',
              borderRadius: 10, padding: '10px 14px', cursor: item.onClick ? 'pointer' : 'default',
            }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e5f0', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              <div style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.72rem' }}>{item.meta}</div>
            </span>
            <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.7rem', flexShrink: 0 }}>{timeAgo(item.ts)}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default ActivityFeed;
