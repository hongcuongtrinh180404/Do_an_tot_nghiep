'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import { useSectionLessonsQuery } from '../api/course.api';

interface SectionLessonsListProps {
  sectionId: string;
}

export function SectionLessonsList({ sectionId }: SectionLessonsListProps): React.JSX.Element {
  const { data: lessons, isLoading, isError, refetch } = useSectionLessonsQuery(sectionId);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-2 py-1 pl-4 border-l-2 border-border/40 ml-2">
        <div className="h-4 w-1/3 bg-muted/60 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="flex items-center justify-between text-xs text-destructive py-1.5 px-2.5 rounded-md bg-destructive/5 border border-destructive/20 ml-2">
        <span className="flex items-center gap-1.5">
          <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
          Không thể tải danh sách bài học
        </span>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="text-xs underline hover:no-underline font-medium ml-2"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (!lessons || lessons.length === 0) {
    return (
      <div className="py-1.5 pl-4 border-l-2 border-border/30 ml-2">
        <p className="text-xs text-muted-foreground italic">
          Chưa có bài học nào trong chương này
        </p>
      </div>
    );
  }

  // 4. Success State: Render Lessons in exact order ASC returned by API
  return (
    <div className="space-y-1 pl-4 border-l-2 border-border/40 ml-2">
      {lessons.map((lesson) => {
        const lessonOrder = String(lesson.order + 1).padStart(2, '0');

        return (
          <div
            key={lesson.id}
            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-md hover:bg-muted/30 transition-colors text-xs text-foreground group"
          >
            <Icon
              icon="lucide:play-circle"
              className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
            />
            <span className="font-mono text-muted-foreground text-[11px] shrink-0 font-medium">
              {lessonOrder}.
            </span>
            <span className="font-medium truncate flex-1">{lesson.title}</span>
          </div>
        );
      })}
    </div>
  );
}
