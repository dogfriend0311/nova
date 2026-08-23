import React from 'react';
import './Skeleton.css';

/**
 * Skeleton.jsx — shimmer loading placeholders.
 *
 * `Skel` is the raw building block (a shimmering box); everything else in
 * this file composes it into shapes that match a specific piece of real UI,
 * so the layout doesn't jump once the real content swaps in. Reach for one
 * of the pre-built shapes below first — only drop down to `<Skel>` directly
 * for a one-off shape nothing here covers yet.
 */

export const Skel = ({ width = '100%', height = 14, radius = 6, style = {}, className = '' }) => (
  <span
    className={`skel ${className}`}
    style={{ display: 'block', width, height, borderRadius: radius, ...style }}
  />
);

/** Matches .sh-score-card in SportsHub.css: team rows + a status line. */
export const ScoreCardSkeleton = () => (
  <div className="sh-score-card" aria-hidden="true">
    <Skel width="40%" height={11} style={{ marginBottom: 10 }} />
    {[0, 1].map(i => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Skel width={24} height={24} radius={999} />
        <Skel width="55%" height={13} />
        <Skel width={22} height={13} style={{ marginLeft: 'auto' }} />
      </div>
    ))}
  </div>
);

/** Grid of ScoreCardSkeletons — drop-in replacement for the sh-loading spinner on Scores. */
export const ScoresGridSkeleton = ({ count = 6 }) => (
  <div className="sh-scores-grid" aria-hidden="true" aria-label="Loading scores">
    {Array.from({ length: count }).map((_, i) => <ScoreCardSkeleton key={i} />)}
  </div>
);

/** One row inside a standings table (rank + team + a handful of stat columns). */
const StandingsRowSkeleton = ({ cols = 5 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: '1px solid rgba(100,120,200,0.1)' }}>
    <Skel width={18} height={12} />
    <Skel width={20} height={20} radius={999} />
    <Skel width="30%" height={12} />
    <span style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
      {Array.from({ length: cols }).map((_, i) => <Skel key={i} width={22} height={12} />)}
    </span>
  </div>
);

/** Matches .sh-standings-group — a titled group of team rows. */
export const StandingsSkeleton = ({ groups = 2, rows = 5 }) => (
  <div className="sh-standings-wrap" aria-hidden="true" aria-label="Loading standings">
    {Array.from({ length: groups }).map((_, g) => (
      <div key={g} className="sh-standings-group">
        <div style={{ padding: '12px 14px' }}><Skel width="35%" height={13} /></div>
        {Array.from({ length: rows }).map((_, r) => <StandingsRowSkeleton key={r} />)}
      </div>
    ))}
  </div>
);

/** Matches .sh-news-card — thumbnail + headline + byline. */
const NewsCardSkeleton = () => (
  <div className="sh-news-card no-link" aria-hidden="true">
    <Skel height={140} radius={0} />
    <div style={{ padding: '12px 14px' }}>
      <Skel width="90%" height={14} style={{ marginBottom: 8 }} />
      <Skel width="70%" height={14} style={{ marginBottom: 10 }} />
      <Skel width="40%" height={11} />
    </div>
  </div>
);

export const NewsGridSkeleton = ({ count = 6 }) => (
  <div className="sh-news-grid" aria-hidden="true" aria-label="Loading news">
    {Array.from({ length: count }).map((_, i) => <NewsCardSkeleton key={i} />)}
  </div>
);

/** Matches a member card in MemberPages.jsx — avatar + name + bio lines. */
export const MemberCardSkeleton = () => (
  <div aria-hidden="true" style={{
    background: 'rgba(12,12,35,0.9)', border: '1px solid rgba(100,120,200,0.18)',
    borderRadius: 14, padding: '0 16px 16px', overflow: 'hidden',
  }}>
    <Skel height={70} radius={0} style={{ margin: '0 -16px 0' }} />
    <Skel width={64} height={64} radius="50%" style={{ marginTop: -32, border: '3px solid rgba(12,12,35,0.9)' }} />
    <div style={{ marginTop: 10 }}>
      <Skel width="60%" height={16} style={{ marginBottom: 8 }} />
      <Skel width="85%" height={12} style={{ marginBottom: 5 }} />
      <Skel width="50%" height={12} />
    </div>
  </div>
);

export const MemberGridSkeleton = ({ count = 8 }) => (
  <div
    aria-hidden="true"
    aria-label="Loading members"
    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}
  >
    {Array.from({ length: count }).map((_, i) => <MemberCardSkeleton key={i} />)}
  </div>
);

/**
 * Generic fallback: a handful of shimmering rows. Use for tables/lists that
 * don't have (or don't yet need) a shape tailored to them — e.g. the many
 * league tabs in ViztaLeague.jsx, as a drop-in for their plain "Loading…"
 * text so the page doesn't just go blank while data fetches.
 */
export const RowsSkeleton = ({ rows = 6, height = 16 }) => (
  <div aria-hidden="true" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 0' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skel key={i} height={height} width={`${88 - (i % 3) * 10}%`} />
    ))}
  </div>
);

export default Skel;
