import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  iridescent?: boolean;
  interactive?: boolean;
  depth?: 1 | 2 | 3;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  iridescent = false,
  interactive = true,
  depth = 1,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    mouseX.set(-1000);
    mouseY.set(-1000);
  };

  const depthStyles = {
    1: 'shadow-lg shadow-black/5 dark:shadow-black/20',
    2: 'shadow-xl shadow-black/10 dark:shadow-black/30',
    3: 'shadow-2xl shadow-black/15 dark:shadow-black/40',
  }[depth];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={interactive ? { y: -3, transition: { duration: 0.2 } } : undefined}
      className={`group relative overflow-hidden rounded-[28px] border backdrop-blur-glass transition-all duration-300
        ${depthStyles}
        /* Glass fill: 50% in light mode, 12% in dark mode */
        bg-white/55 dark:bg-slate-900/40
        /* 1px inner highlight on top/left, subtle rim on bottom/right */
        border-white/70 dark:border-white/10
        shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12)]
        ${iridescent ? 'before:absolute before:inset-0 before:-z-10 before:rounded-[28px] before:p-[1.5px] before:bg-gradient-to-tr before:from-indigo-500/50 before:via-purple-500/30 before:to-emerald-400/50' : ''}
        ${className}
      `}
      {...(props as any)}
    >
      {/* Specular Shimmer that follows cursor */}
      {interactive && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                450px circle at ${mouseX}px ${mouseY}px,
                rgba(255, 255, 255, 0.4),
                transparent 70%
              )
            `,
          }}
        />
      )}

      {/* Dark mode specular shimmer with subtle indigo accent */}
      {interactive && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[28px] opacity-0 transition-opacity duration-300 dark:group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                450px circle at ${mouseX}px ${mouseY}px,
                rgba(129, 140, 248, 0.18),
                transparent 70%
              )
            `,
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
