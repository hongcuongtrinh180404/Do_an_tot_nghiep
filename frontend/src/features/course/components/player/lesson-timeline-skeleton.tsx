'use client';

import React from 'react';

export function LessonTimelineSkeleton(): React.JSX.Element {
  return (
    <div className="h-full overflow-hidden px-2 py-2.5 space-y-1.5 animate-pulse">
      {/* Search Header Skeleton */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-3 w-14 bg-muted/80 rounded" />
      </div>

      {/* Search Input Skeleton */}
      <div className="h-8 w-full bg-muted/60 rounded-lg mb-1.5" />

      {/* Sentence Item Skeletons */}
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="py-2 px-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2.5"
          >
            {/* Timestamp Pill Badge Skeleton */}
            <div className="h-5 w-14 bg-muted/80 rounded-full shrink-0" />

            {/* Sentence Content Skeleton */}
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-full bg-muted/70 rounded" />
              <div className="h-3 w-3/4 bg-muted/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
