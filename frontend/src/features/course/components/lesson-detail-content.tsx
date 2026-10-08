'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useLessonDetailQuery } from '../api/course.api';
import { LessonDetailSkeleton } from './lesson-detail-skeleton';
import { LessonPlayerStudio } from './player';

interface LessonDetailContentProps {
  courseId: string;
  lessonId: string;
  backUrl?: string;
}

export function LessonDetailContent({
  courseId,
  lessonId,
  backUrl,
}: LessonDetailContentProps): React.JSX.Element {
  const defaultBackUrl = backUrl || `/instructor/courses/${courseId}`;
  const { data: lesson, isLoading, isError, error, refetch } = useLessonDetailQuery(lessonId);

  // 1. Loading State
  if (isLoading) {
    return <LessonDetailSkeleton />;
  }

  // 2. Error / 404 State
  if (isError || !lesson) {
    const is404 =
      (error as { response?: { status?: number } })?.response?.status === 404 || !lesson;

    return (
      <div className="h-screen w-full flex items-center justify-center p-6 bg-background text-foreground">
        <Card className="max-w-md w-full border border-destructive/20 bg-card text-center p-8 shadow-xl">
          <CardContent className="space-y-4 pt-2">
            <div className="size-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
              <Icon icon="lucide:alert-circle" className="size-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                {is404 ? 'Không tìm thấy bài học' : 'Lỗi tải bài học'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {is404
                  ? 'Bài học không tồn tại hoặc đã bị xóa khỏi hệ thống.'
                  : 'Không thể tải thông tin bài học từ máy chủ. Vui lòng thử lại sau.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetch();
                }}
              >
                <Icon icon="lucide:refresh-cw" className="size-3.5 mr-2" />
                Thử lại
              </Button>
              <Link
                href={defaultBackUrl}
                className={buttonVariants({
                  variant: 'default',
                  size: 'sm',
                  className: 'bg-primary text-primary-foreground',
                })}
              >
                <Icon icon="lucide:arrow-left" className="size-3.5 mr-2" />
                Quay lại khóa học
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Success State: Master Cinema Player Studio (70/30 Layout & 3 Bottom Tabs)
  return (
    <LessonPlayerStudio
      courseId={courseId}
      lesson={lesson}
      backUrl={defaultBackUrl}
    />
  );
}
