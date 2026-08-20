import React from 'react';

// Simplified per feedback: the animated starfield + rocket canvas made
// text (especially gradient-clipped headings like "Welcome back") hard
// to read, and was extra animation weight on phones. This is now a
// plain, calm dark gradient — no canvas, no per-frame redraws.
const SpaceBackground = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #05060d 0%, #0a0d1a 45%, #0a0d1a 55%, #05060d 100%)',
        zIndex: 0,
      }}
    />
  );
};

export default SpaceBackground;
