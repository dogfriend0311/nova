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
            radial-gradient(ellipse at 20% 50%, rgba(108, 92, 231, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(94, 129, 244, 0.12) 0%, transparent 50%),
            linear-gradient(180deg, #0a0d1a 0%, #131729 50%, #0a0d1a 100%)
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
