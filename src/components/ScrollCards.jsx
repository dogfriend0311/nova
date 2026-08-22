import React from 'react';

// Small shared building blocks for "horizontal scroll of cards" sections
// on Home (This Week in Nova, On This Day) so both stay visually consistent
// without duplicating the same inline styles in two files.

export const CardShell = ({ kicker, onClick, children }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    style={{
      flex: '0 0 240px', scrollSnapAlign: 'start', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.14)',
      borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
    }}
  >
    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(158,165,196,0.4)' }}>{kicker}</span>
    {children}
  </button>
);

export const ScrollRow = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8, marginBottom: 12 }}>
    {children}
  </div>
);
