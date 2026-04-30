import React from 'react';
import StarField from './StarField';
import RocketAnimation from './RocketAnimation';

const SpaceBackground = () => {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(0, 191, 255, 0.1) 0%, transparent 50%),
            linear-gradient(180deg, #0a0a23 0%, #1a0a3a 50%, #0a0a23 100%)
          `,
          zIndex: 0,
        }}
      />
      <StarField />
      <RocketAnimation />
    </>
  );
};

export default SpaceBackground;
