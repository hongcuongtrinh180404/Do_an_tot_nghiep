'use client';

import React, { useState } from 'react';
import type { ICourse } from 'share-lib';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useUpdateCourseMutation } from '../../api/course.api';

interface CourseShortDescInlineCardProps {
  course: ICourse;
}

const MAX_CHARS = 200;

export function CourseShortDescInlineCard({
  course,
}: CourseShortDescInlineCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(course.shortDescription ?? '');

  const { mutate: updateCourse, isPending } = useUpdateCourseMutation(course.id);

  const handleStartEdit = () => {
    setValue(course.shortDescription ?? '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValue(course.shortDescription ?? '');
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed.length > MAX_CHARS) return;

    if (trimmed === (course.shortDescription ?? '').trim()) {
      setIsEditing(false);
      return;
    }

    updateCourse(
      { shortDescription: trimmed || null },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  };

  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > 180 && !isOverLimit;

  return (
    <Card className="border-border/50 bg-card/60 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Icon icon="lucide:file-text" className="size-4 text-muted-foreground" />
          Mô tả ngắn gọn
        </CardTitle>

        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
          >
            <Icon icon="lucide:pencil" className="size-3" />
            Sửa
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                rows={3}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isPending}
                placeholder="Nhập mô tả ngắn gọn về khóa học (giới hạn 200 ký tự)..."
                className="w-full text-sm rounded-lg border border-input bg-background p-3 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 text-foreground resize-y leading-relaxed disabled:opacity-50"
              />
              <div className="flex justify-end mt-1">
                <span
                  className={`text-xs font-mono font-medium ${
                    isOverLimit
                      ? 'text-destructive font-bold'
                      : isNearLimit
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                  }`}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
                className="h-8 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending || isOverLimit}
                className="h-8 text-xs"
              >
                {isPending && <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />}
                Lưu thay đổi
              </Button>
            </div>
          </div>
        ) : course.shortDescription?.trim() ? (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {course.shortDescription}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Chưa có mô tả ngắn
          </p>
        )}
      </CardContent>
    </Card>
  );
}
