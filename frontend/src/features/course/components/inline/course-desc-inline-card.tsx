'use client';

import React, { useState, useMemo } from 'react';
import type { ICourse } from 'share-lib';
import DOMPurify from 'isomorphic-dompurify';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useUpdateCourseMutation } from '../../api/course.api';

interface CourseDescInlineCardProps {
  course: ICourse;
}

export function CourseDescInlineCard({
  course,
}: CourseDescInlineCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(course.description ?? '');

  const { mutate: updateCourse, isPending } = useUpdateCourseMutation(course.id);

  const sanitizedHtml = useMemo(() => {
    if (!course.description?.trim()) return '';
    return DOMPurify.sanitize(course.description);
  }, [course.description]);

  const handleStartEdit = () => {
    setContent(course.description ?? '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setContent(course.description ?? '');
    setIsEditing(false);
  };

  const handleSave = () => {
    // Normalize empty tiptap tags
    const normalized = content.replace(/<p><\/p>|<p><br><\/p>/g, '').trim();

    if (normalized === (course.description ?? '').trim()) {
      setIsEditing(false);
      return;
    }

    updateCourse(
      { description: normalized ? content : null },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  };

  return (
    <Card className="border-border/50 bg-card/60 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Icon icon="lucide:align-left" className="size-4 text-muted-foreground" />
          Nội dung mô tả chi tiết
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
            Chỉnh sửa nội dung
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-4">
            <RichTextEditor
              value={content}
              onChange={setContent}
              disabled={isPending}
              placeholder="Soạn thảo nội dung mô tả chi tiết cho khóa học..."
              minHeight="240px"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
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
                disabled={isPending}
                className="h-8 text-xs"
              >
                {isPending && <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />}
                Lưu nội dung
              </Button>
            </div>
          </div>
        ) : sanitizedHtml ? (
          <div
            className="prose prose-slate dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Chưa có nội dung mô tả chi tiết
          </p>
        )}
      </CardContent>
    </Card>
  );
}
