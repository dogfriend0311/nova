import React, { useEffect, useState } from 'react';

const RocketAnimation = () => {
  const [rockets, setRockets] = useState([]);

  useEffect(() => {
    const launchRocket = () => {
      const newRocket = {
        id: Date.now(),
        startTime: Date.now(),
        direction: Math.random() > 0.5 ? 'ltr' : 'rtl', // left-to-right or right-to-left
        verticalPos: Math.random() * 60 + 10, // between 10% and 70% of viewport height
      };

      setRockets((prev) => [...prev, newRocket]);

      // Remove rocket after animation completes
      setTimeout(() => {
        setRockets((prev) => prev.filter((r) => r.id !== newRocket.id));
      }, 6000);
    };

    // Launch a rocket every 10 seconds
    const interval = setInterval(launchRocket, 10000);

    // Launch first rocket immediately
    launchRocket();

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
      {rockets.map((rocket) => (
        <RocketObject key={rocket.id} rocket={rocket} />
      ))}
    </div>
  );
};

const RocketObject = ({ rocket }) => {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 6000; // 6 second animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setPosition(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const isLTR = rocket.direction === 'ltr';
  const xPos = isLTR ? position * 100 : 100 - position * 100;
  const rotation = isLTR ? 0 : 180;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${xPos}%`,
        top: `${rocket.verticalPos}%`,
        transform: `translateX(-50%) translateY(-50%) rotateZ(${rotation}deg)`,
        zIndex: 2,
      }}
    >
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.8))',
        }}
      >
        {/* Rocket body */}
        <rect x="20" y="10" width="20" height="35" fill="#FF6B6B" rx="3" />
        
        {/* Rocket nose */}
        <path d="M 30 5 L 25 10 L 35 10 Z" fill="#FFD93D" />
        
        {/* Window */}
        <circle cx="30" cy="15" r="3" fill="#00FFFF" />
        
        {/* Left fin */}
        <path d="M 20 30 L 10 40 L 20 35 Z" fill="#FF00FF" />
        
        {/* Right fin */}
        <path d="M 40 30 L 50 40 L 40 35 Z" fill="#FF00FF" />
        
        {/* Flame */}
        <path
          d="M 25 45 Q 25 50 30 55 Q 35 50 35 45"
          fill="#FF6B6B"
          style={{
            animation: 'flameFlicker 0.3s infinite alternate',
          }}
        />
        <path
          d="M 26 47 Q 26 50 30 53 Q 34 50 34 47"
          fill="#FFD93D"
          style={{
            animation: 'flameFlicker 0.2s 0.1s infinite alternate',
          }}
        />
      </svg>

      <style>{`
        @keyframes flameFlicker {
          from {
            opacity: 0.8;
            transform: scaleY(1);
          }
          to {
            opacity: 1;
            transform: scaleY(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default RocketAnimation;
