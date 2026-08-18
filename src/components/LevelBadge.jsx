import React, { useEffect, useState } from 'react';
import db from '../services/db';
import { levelProgress } from '../services/reputationService';

// Small "Lv. 7 — All-Star" chip, with an optional XP progress bar.
// Fetches synced stats itself so it can be dropped anywhere a
// username is known (profile header, member list, etc.).
export const LevelBadge = ({ username, showBar = false, size = 'md' }) => {
  const [xp, setXp] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!username) return;
    db.getUserStats(username).then(stats => { if (!cancelled) setXp(stats?.xp || 0); }).catch(() => {});
    return () => { cancelled = true; };
  }, [username]);

  if (xp === null) return null;
  const { level, title, floor, ceil, pct } = levelProgress(xp);
  const fontSize = size === 'sm' ? '0.68rem' : '0.78rem';

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, verticalAlign: 'middle' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, width: 'fit-content',
        padding: size === 'sm' ? '2px 8px' : '3px 10px', borderRadius: 999, fontWeight: 800, fontSize,
        background: 'rgba(94,129,244,0.14)', border: '1px solid rgba(94,129,244,0.3)', color: 'var(--color-cyan)',
      }}>
        Lv. {level} · {title}
      </span>
      {showBar && (
        <span style={{ display: 'block', width: 120, height: 4, borderRadius: 4, background: 'rgba(94,129,244,0.1)', overflow: 'hidden' }} title={`${xp - floor} / ${ceil - floor} XP to next level`}>
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--color-cyan)' }} />
        </span>
      )}
    </span>
  );
};

export default LevelBadge;
