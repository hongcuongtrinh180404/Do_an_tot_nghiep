'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { useSectionLessonsQuery } from '../api/course.api';

interface SectionLessonsListProps {
  sectionId: string;
  courseId?: string;
}

export function SectionLessonsList({
  sectionId,
  courseId,
}: SectionLessonsListProps): React.JSX.Element {
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
        const lessonUrl = courseId
          ? `/instructor/courses/${courseId}/lessons/${lesson.id}`
          : undefined;

        const iconName =
          lesson.content?.type === 'video'
            ? 'lucide:play-circle'
            : lesson.content?.type === 'document'
              ? 'lucide:file-text'
              : 'lucide:circle-dashed';

        if (lessonUrl) {
          return (
            <div
              key={lesson.id}
              className="flex items-center justify-between gap-2.5 py-1.5 px-2.5 rounded-md hover:bg-muted/40 transition-colors text-xs text-foreground group"
            >
              <Link
                href={lessonUrl}
                className="flex items-center gap-2.5 flex-1 min-w-0 hover:text-primary transition-colors"
              >
                <Icon
                  icon={iconName}
                  className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                />
                <span className="font-mono text-muted-foreground text-[11px] shrink-0 font-medium">
                  {lessonOrder}.
                </span>
                <span className="font-medium truncate">{lesson.title}</span>
                {lesson.isPreview && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                    Học thử
                  </span>
                )}
              </Link>

              <Link
                href={lessonUrl}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-medium text-primary flex items-center gap-1 hover:underline shrink-0"
              >
                <span>Xem bài học</span>
                <Icon icon="lucide:arrow-right" className="size-3" />
              </Link>
            </div>
          );
        }

        return (
          <div
            key={lesson.id}
            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-md hover:bg-muted/30 transition-colors text-xs text-foreground group"
          >
            <Icon
              icon={iconName}
              className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
            />
            <span className="font-mono text-muted-foreground text-[11px] shrink-0 font-medium">
              {lessonOrder}.
            </span>
            <span className="font-medium truncate flex-1">{lesson.title}</span>
            {lesson.isPreview && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                Học thử
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
