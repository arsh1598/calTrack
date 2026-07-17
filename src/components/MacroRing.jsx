import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated SVG ring/arc progress meter
 */
export default function MacroRing({
  label,
  value,
  goal,
  color,
  gradientId,
  gradientColors,
  unit = '',
  size = 120,
  strokeWidth = 10,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / (goal || 1), 1);
  const offset = circumference * (1 - pct);

  const isOver = value > goal;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Defs for gradient */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
            <filter id={`glow-${gradientId}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(39,39,42,0.8)"
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            filter={`url(#glow-${gradientId})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-lg font-bold text-zinc-50 leading-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4, ease: 'backOut' }}
          >
            {value}
          </motion.span>
          <span className="text-[10px] text-zinc-500 font-medium mt-0.5">{unit || 'g'}</span>
        </div>

        {/* Over-budget indicator */}
        {isOver && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border border-zinc-950"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          />
        )}
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {value} / {goal}{unit || 'g'}
        </p>
      </div>
    </div>
  );
}
