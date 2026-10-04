'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ICourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { useUpdateCourseMutation } from '../../api/course.api';
import { slugify } from 'share-lib';

interface CourseTitleInlineEditProps {
  course: ICourse;
}

export function CourseTitleInlineEdit({ course }: CourseTitleInlineEditProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(course.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { mutate: updateCourse, isPending } = useUpdateCourseMutation(course.id);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setTitleValue(course.title);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTitleValue(course.title);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 200) {
      return;
    }

    if (trimmed === course.title) {
      setIsEditing(false);
      return;
    }

    updateCourse(
      { title: trimmed },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Option A: Click outside (onBlur) cancels edit mode to prevent accidental changes
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Only cancel if focus moved completely outside the editing container
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      handleCancel();
    }
  };

  const previewSlug = titleValue.trim() ? slugify(titleValue.trim()) : course.slug;
  const isInvalid = titleValue.trim().length < 3 || titleValue.trim().length > 200;

  return (
    <div className="space-y-2">
      {isEditing ? (
        <div ref={containerRef} onBlur={handleBlur} className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                maxLength={200}
                placeholder="Nhập tên khóa học..."
                className="w-full text-xl sm:text-2xl font-bold tracking-tight bg-background border border-ring/60 focus:border-ring rounded-lg px-3 py-1.5 outline-none shadow-xs text-foreground disabled:opacity-60"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground select-none pointer-events-none">
                {titleValue.length}/200
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || isInvalid}
                title="Lưu (Enter)"
                className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? (
                  <Icon icon="lucide:loader-2" className="size-5 animate-spin" />
                ) : (
                  <Icon icon="lucide:check" className="size-5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                title="Hủy (Esc)"
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Icon icon="lucide:x" className="size-5" />
              </button>
            </div>
          </div>

          {/* Slug Preview during editing */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon icon="lucide:link" className="size-3 shrink-0" />
            <span>Slug dự kiến:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">
              {previewSlug}
            </code>
            {previewSlug !== course.slug && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                (Tự động điều chỉnh nếu trùng)
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 group">
            <h1
              onClick={handleStartEdit}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight hover:text-foreground/90 cursor-pointer transition-colors"
            >
              {course.title}
            </h1>
            <button
              type="button"
              onClick={handleStartEdit}
              title="Chỉnh sửa tiêu đề"
              className="p-1.5 rounded-md bg-muted/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shrink-0"
            >
              <Icon icon="lucide:pencil" className="size-4" />
            </button>
          </div>

          {/* Slug badge */}
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground bg-muted/60 border border-border/50 px-2.5 py-1 rounded-md">
              <Icon icon="lucide:link" className="size-3 text-muted-foreground/70 shrink-0" />
              <span>{course.slug}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
