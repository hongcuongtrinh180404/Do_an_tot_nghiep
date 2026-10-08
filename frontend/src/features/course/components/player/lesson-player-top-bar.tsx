'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';

interface LessonPlayerTopBarProps {
  courseId: string;
  courseTitle?: string;
  lessonTitle: string;
  lessonOrder?: number;
  isPreview?: boolean;
  backUrl: string;
}

export function LessonPlayerTopBar({
  courseTitle,
  lessonTitle,
  lessonOrder,
  isPreview = false,
  backUrl,
}: LessonPlayerTopBarProps): React.JSX.Element {
  const displayOrder =
    lessonOrder !== undefined ? String(lessonOrder + 1).padStart(2, '0') : null;

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shadow-2xs">
      {/* Left: Back button & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={backUrl}
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className:
              'h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 shrink-0 rounded-lg',
          })}
        >
          <Icon icon="lucide:arrow-left" className="size-4" />
          <span className="hidden sm:inline text-xs font-medium">Quay lại khóa học</span>
        </Link>

        <div className="h-4 w-px bg-border shrink-0" />

        {/* Title & Hierarchy */}
        <div className="flex items-center gap-2 min-w-0">
          {displayOrder && (
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-muted border border-border font-mono text-[11px] font-bold text-muted-foreground">
              Bài {displayOrder}
            </span>
          )}

          <h1 className="text-sm font-bold text-foreground truncate max-w-md sm:max-w-lg">
            {lessonTitle}
          </h1>

          {courseTitle && (
            <span className="hidden md:inline text-xs text-muted-foreground truncate">
              ({courseTitle})
            </span>
          )}
        </div>
      </div>

      {/* Right: Status badge */}
      <div className="flex items-center gap-2 shrink-0">
        {isPreview ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <Icon icon="lucide:sparkles" className="size-3" />
            <span>Học thử miễn phí</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            <Icon icon="lucide:lock" className="size-3" />
            <span>Bài học chính thức</span>
          </span>
        )}
      </div>
    </header>
  );
}
