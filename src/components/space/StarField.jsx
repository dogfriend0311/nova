import React, { useEffect, useRef } from 'react';

const StarField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Star configuration
    const stars = [];
    const starCount = 200;

    // Initialize stars
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random() * 0.7 + 0.3,
        twinkleDuration: Math.random() * 3000 + 1000,
        twinkling: Math.random() * 3000,
      });
    }

    let animationId;

    const animate = (timestamp) => {
      // Clear canvas with slight trail effect
      ctx.fillStyle = 'rgba(10, 10, 35, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update stars
      stars.forEach((star) => {
        star.twinkling += 16;
        if (star.twinkling >= star.twinkleDuration) {
          star.twinkling = 0;
        }

        // Calculate twinkle effect
        const twinkleProgress = star.twinkling / star.twinkleDuration;
        const twinkleOpacity =
          star.opacity * Math.sin(twinkleProgress * Math.PI);

        // Draw star
        ctx.fillStyle = `rgba(200, 220, 255, ${twinkleOpacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Add glow effect
        ctx.fillStyle = `rgba(150, 200, 255, ${twinkleOpacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          star.x,
          star.y,
          star.radius + 1.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default StarField;
