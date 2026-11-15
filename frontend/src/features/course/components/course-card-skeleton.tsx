import React from 'react';

export function CourseCardSkeleton(): React.JSX.Element {
  return (
    <div className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-card rounded-xl overflow-hidden shadow-2xs animate-pulse">
      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch gap-5">
        {/* Thumbnail skeleton */}
        <div className="w-full md:w-[240px] lg:w-[260px] aspect-video rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />

        {/* Center Details skeleton */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-56 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
              <div className="h-5 w-24 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
            </div>
          </div>
          <div className="h-4 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
        </div>

        {/* Right price & actions skeleton */}
        <div className="w-full md:w-auto shrink-0 flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
          <div className="h-6 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            <div className="size-9 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CourseListSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <CourseCardSkeleton />
      <CourseCardSkeleton />
      <CourseCardSkeleton />
    </div>
  );
}

