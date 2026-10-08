import React from 'react';

export function LessonDetailSkeleton(): React.JSX.Element {
  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground select-none animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="h-14 shrink-0 border-b border-border bg-card px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 bg-muted rounded-lg" />
          <div className="h-4 w-48 bg-muted/80 rounded" />
        </div>
        <div className="h-6 w-24 bg-muted rounded-full" />
      </div>

      {/* Main Container Wrapper: Ergonomic Laptop Bounds */}
      <div className="flex-1 w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Deck: 16:9 Video & Matching Sidebar Height */}
        <div className="w-full flex flex-col lg:flex-row items-stretch gap-6 xl:gap-[40px]">
          {/* Left Column: 16:9 Aspect Video Skeleton */}
          <div className="flex-1 min-w-0 w-full aspect-video bg-card border border-border rounded-2xl p-4 flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <div className="size-16 rounded-full bg-zinc-800" />
            </div>
          </div>

          {/* Right Column: Nav Sidebar Card Skeleton */}
          <div className="w-full lg:w-[360px] min-[1440px]:w-[400px] 2xl:w-[420px] shrink-0 h-[420px] lg:h-auto bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="h-10 w-full bg-muted rounded-xl" />
            <div className="space-y-2.5 pt-2">
              <div className="h-14 w-full bg-muted/70 rounded-xl" />
              <div className="h-14 w-full bg-muted/70 rounded-xl" />
              <div className="h-14 w-full bg-muted/70 rounded-xl" />
              <div className="h-14 w-full bg-muted/70 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Bottom Deck: 3-Tabs Card Skeleton */}
        <div className="w-full bg-card border border-border rounded-2xl p-6 space-y-4 min-h-[360px]">
          <div className="grid grid-cols-3 gap-3 pb-3 border-b border-border">
            <div className="h-10 bg-muted/60 rounded-xl" />
            <div className="h-10 bg-muted/60 rounded-xl" />
            <div className="h-10 bg-muted/60 rounded-xl" />
          </div>
          <div className="h-44 w-full bg-muted/30 rounded-xl border border-dashed border-border flex items-center justify-center" />
        </div>
      </div>
    </div>
  );
}
