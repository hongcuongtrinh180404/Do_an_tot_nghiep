'use client';

import React from 'react';

interface TimelinePinMarkerProps {
  percent: number;
  time: number;
  formatTime: (seconds: number) => string;
  onClick: (e: React.MouseEvent) => void;
  label?: string;
}

export function TimelinePinMarker({
  percent,
  time,
  formatTime,
  onClick,
  label = 'Thêm câu hỏi',
}: TimelinePinMarkerProps): React.JSX.Element {
  // Clamp percent between 0% and 100%
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      style={{ left: `${clampedPercent}%` }}
      className="absolute bottom-2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none group/pin select-none"
    >
      {/* 1. Floating Tooltip */}
      <div className="mb-1.5 px-2.5 py-1 rounded-md bg-zinc-950/95 text-zinc-100 text-[11px] font-medium border border-zinc-800/80 shadow-2xl backdrop-blur-xs flex items-center gap-1.5 whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-100">
        <span className="font-mono text-amber-400 font-bold">{formatTime(time)}</span>
        <span className="text-zinc-500">•</span>
        <span className="font-medium text-zinc-200">{label}</span>
      </div>

      {/* 2. Interactive Google Maps Pin Button */}
      <button
        type="button"
        onClick={onClick}
        onMouseDown={(e) => e.stopPropagation()}
        title={`${formatTime(time)} - ${label}`}
        aria-label={`${label} tại ${formatTime(time)}`}
        className="pointer-events-auto transform transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full"
      >
        <svg
          viewBox="0 0 28 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-9 filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.45)]"
        >
          {/* Outer Pin Body (Inverted teardrop shape pointing down to timeline) */}
          <path
            d="M14 1C6.82 1 1 6.82 1 14C1 23.5 14 35 14 35C14 35 27 23.5 27 14C27 6.82 21.18 1 14 1Z"
            className="fill-amber-400 stroke-white dark:stroke-zinc-950"
            strokeWidth="2"
          />

          {/* Inner Highlight Circle for Depth */}
          <circle cx="14" cy="14" r="9" className="fill-amber-300/40" />

          {/* Plus '+' Symbol in center (Màu trắng ngà - Ivory White) */}
          <path
            d="M14 8.5V19.5M8.5 14H19.5"
            className="stroke-[#fafaf9]"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 3. Small Pulsing Anchor Dot directly on the timeline groove */}
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-950 translate-y-1 shadow-xs pointer-events-none" />
    </div>
  );
}
