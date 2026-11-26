import React, { useEffect, useRef } from 'react';

export const AuroraBackground: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Aurora blob particle configuration: indigo, aqua, rose, lavender
    const blobs = [
      { x: width * 0.2, y: height * 0.25, r: 380, color: 'rgba(99, 102, 241, 0.28)', vx: 0.35, vy: 0.25 },
      { x: width * 0.8, y: height * 0.2, r: 350, color: 'rgba(45, 212, 191, 0.24)', vx: -0.28, vy: 0.32 },
      { x: width * 0.3, y: height * 0.75, r: 420, color: 'rgba(244, 63, 94, 0.22)', vx: 0.25, vy: -0.3 },
      { x: width * 0.75, y: height * 0.8, r: 400, color: 'rgba(168, 85, 247, 0.26)', vx: -0.32, vy: -0.22 },
      { x: width * 0.5, y: height * 0.5, r: 460, color: 'rgba(56, 189, 248, 0.20)', vx: 0.2, vy: 0.18 },
    ];

    let t = 0;
    const render = () => {
      t += 0.01;
      ctx.clearRect(0, 0, width, height);

      blobs.forEach((blob, idx) => {
        blob.x += Math.sin(t + idx) * blob.vx * 1.5;
        blob.y += Math.cos(t + idx * 1.2) * blob.vy * 1.5;

        const grad = ctx.createRadialGradient(blob.x, blob.y, 10, blob.x, blob.y, blob.r);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${className}`}>
      {/* Drifting Aurora Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70 dark:opacity-40 blur-[80px]"
      />
      {/* Texture noise */}
      <div className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-noise" />
      <div className="relative z-10 w-full min-h-screen">{children}</div>
    </div>
  );
};
