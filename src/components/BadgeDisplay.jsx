import React, { useState } from 'react';

/**
 * BadgeDisplay.jsx — small admin-assigned badges shown next to a member's
 * name (member cards, expanded member view, and a member's own profile).
 * Hovering a badge shows its name + description in a tooltip.
 *
 * These are distinct from the automatic "achievement" badges in
 * achievementsService.js (the 🏅 Badges tab) — these are created,
 * deleted, and assigned by owners/co-founders from the admin dashboard,
 * and each member chooses which of their assigned badges to display.
 */

export const BadgeChip = ({ badge, size = 15 }) => {
  const [hover, setHover] = useState(false);
  if (!badge) return null;
  const color = badge.color || '#5e81f4';
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', lineHeight: 1 }}
    >
      <span style={{ fontSize: size }}>{badge.icon || '🏅'}</span>
      {hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', bottom: '135%', left: '50%', transform: 'translateX(-50%)',
            background: '#12162b', border: `1px solid ${color}55`,
            color: '#e2e5f0', padding: '7px 11px', borderRadius: 8,
            fontSize: '0.72rem', lineHeight: 1.4, minWidth: 120, maxWidth: 220,
            whiteSpace: 'normal', textAlign: 'center', zIndex: 60,
            boxShadow: '0 6px 20px rgba(0,0,0,0.55)', pointerEvents: 'none',
          }}
        >
          <span style={{ color, fontWeight: 800, display: 'block' }}>{badge.name}</span>
          {badge.description && (
            <span style={{ display: 'block', color: 'rgba(158,165,196,0.75)', fontWeight: 500, marginTop: 2 }}>
              {badge.description}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

/**
 * Renders a row of badge chips for a member.
 * - badgeTypes: full badge catalog (from db.getBadgeTypes())
 * - ids: the badge ids this member wants displayed, in order
 */
export const BadgeRow = ({ badgeTypes = [], ids = [], size = 15, gap = 5 }) => {
  if (!ids || ids.length === 0) return null;
  const map = Object.fromEntries((badgeTypes || []).map(b => [String(b.id), b]));
  const badges = ids.map(id => map[String(id)]).filter(Boolean);
  if (badges.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      {badges.map(b => <BadgeChip key={b.id} badge={b} size={size} />)}
    </span>
  );
};

/**
 * Small "✅ In Discord" flair for a member confirmed to be in the Discord
 * server (see src/services/discordBadgeCheck.js). Pass the ISO timestamp
 * from profile.discord_verified_at — renders nothing if falsy.
 */
export const DiscordVerifiedChip = ({ verifiedAt, size = 'sm' }) => {
  if (!verifiedAt) return null;
  const small = size === 'sm';
  return (
    <span
      title="Confirmed member of the Discord server"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: small ? '2px 8px' : '3px 10px', borderRadius: 999,
        background: 'rgba(88,101,242,0.15)', border: '1px solid rgba(88,101,242,0.4)',
        color: '#5865F2', fontSize: small ? '0.62rem' : '0.65rem',
        fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}
    >
      💬 In Discord
    </span>
  );
};

export default BadgeRow;
