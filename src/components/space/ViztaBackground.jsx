import React from 'react';

/* Background used only inside the Vizta League section (roster, player
   stat pages, box scores, etc). The rest of the site keeps the star field.
   Place the image file at public/vizta-bg.jpg for this to resolve. */
const ViztaBackground = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        backgroundImage: 'url(/vizta-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay keeps foreground text and cards readable no matter
          where the bright part of the image lands behind them. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,7,13,0.65) 0%, rgba(5,7,13,0.45) 40%, rgba(5,7,13,0.78) 100%)',
        }}
      />
    </div>
  );
};

export default ViztaBackground;
