'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useLessonDetailQuery } from '../api/course.api';
import { LessonDetailSkeleton } from './lesson-detail-skeleton';

interface LessonDetailContentProps {
  courseId: string;
  lessonId: string;
  backUrl?: string;
}

function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds < 0) {
    return '';
  }

  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remSeconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`;
}

function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || bytes <= 0) {
    return '';
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
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
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
          <CardContent className="space-y-4 pt-2">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Icon icon="lucide:alert-circle" className="size-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-foreground">
                {is404 ? 'Không tìm thấy bài học' : 'Lỗi tải bài học'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {is404
                  ? 'Bài học không tồn tại hoặc đã bị xóa khỏi hệ thống.'
                  : 'Không thể tải thông tin bài học từ máy chủ. Vui lòng thử lại sau.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void refetch();
                }}
              >
                <Icon icon="lucide:refresh-cw" className="size-4 mr-2" />
                Thử lại
              </Button>
              <Link href={defaultBackUrl} className={buttonVariants({ variant: 'default' })}>
                <Icon icon="lucide:arrow-left" className="size-4 mr-2" />
                Quay lại khóa học
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayOrder = String(lesson.order + 1).padStart(2, '0');
  const durationText = formatDuration(lesson.content?.duration);
  const sizeText = formatFileSize(lesson.content?.fileSize);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={defaultBackUrl}
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'text-muted-foreground hover:text-foreground -ml-2 gap-1.5',
          })}
        >
          <Icon icon="lucide:arrow-left" className="size-4" />
          <span>Quay lại khóa học</span>
        </Link>
      </div>

      {/* Main Lesson Card */}
      <Card className="border-border/50 bg-card shadow-xs overflow-hidden">
        {/* Header with Title & Metadata Badges */}
        <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Order Badge */}
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border/50">
              Bài {displayOrder}
            </span>

            {/* Preview Status Badge */}
            {lesson.isPreview ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Icon icon="lucide:sparkles" className="size-3" />
                Học thử miễn phí
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                <Icon icon="lucide:lock" className="size-3" />
                Bài học chính thức
              </span>
            )}

            {/* Content Type Badge */}
            {lesson.content?.type === 'video' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                <Icon icon="lucide:video" className="size-3" />
                Video bài giảng
              </span>
            )}
            {lesson.content?.type === 'document' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Icon icon="lucide:file-text" className="size-3" />
                Tài liệu đọc
              </span>
            )}
            {!lesson.content && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                <Icon icon="lucide:file-x" className="size-3" />
                Chưa có nội dung
              </span>
            )}
          </div>

          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
            {lesson.title}
          </CardTitle>
        </CardHeader>

        {/* Content Viewer Body */}
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* 1. Case: Video Player */}
          {lesson.content?.type === 'video' && (
            <div className="space-y-3">
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-md border border-border/40">
                <video
                  key={lesson.content.url}
                  src={lesson.content.url}
                  controls
                  controlsList="nodownload"
                  playsInline
                  className="w-full h-full object-contain"
                >
                  Trình duyệt của bạn không hỗ trợ phát video HTML5.
                </video>
              </div>

              {/* Video Metadata Info Strip */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center gap-1.5">
                  <Icon icon="lucide:film" className="size-3.5 text-primary" />
                  <span className="font-medium text-foreground">
                    {lesson.content.fileName || 'Video bài học'}
                  </span>
                </div>

                {durationText && (
                  <div className="flex items-center gap-1">
                    <Icon icon="lucide:clock" className="size-3.5" />
                    <span>{durationText}</span>
                  </div>
                )}

                {sizeText && (
                  <div className="flex items-center gap-1">
                    <Icon icon="lucide:hard-drive" className="size-3.5" />
                    <span>{sizeText}</span>
                  </div>
                )}

                {lesson.content.mimeType && (
                  <span className="text-[11px] uppercase bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                    {lesson.content.mimeType.split('/')[1] || lesson.content.mimeType}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 2. Case: Document Viewer Card */}
          {lesson.content?.type === 'document' && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Icon icon="lucide:file-text" className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground break-all">
                    {lesson.content.fileName || 'Tài liệu bài học đính kèm'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Tài liệu tham khảo</span>
                    {sizeText && (
                      <>
                        <span>•</span>
                        <span>{sizeText}</span>
                      </>
                    )}
                    {lesson.content.mimeType && (
                      <>
                        <span>•</span>
                        <span className="uppercase font-mono text-[11px]">
                          {lesson.content.mimeType.split('/')[1] || 'document'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <a
                href={lesson.content.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: 'default',
                  size: 'sm',
                  className: 'shrink-0 gap-2 self-start sm:self-auto',
                })}
              >
                <Icon icon="lucide:external-link" className="size-4" />
                <span>Mở tài liệu</span>
              </a>
            </div>
          )}

          {/* 3. Case: No Content Attached */}
          {!lesson.content && (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground border border-border/40">
                <Icon icon="lucide:file-question" className="size-6" />
              </div>
              <h4 className="text-base font-semibold text-foreground">
                Bài học chưa có nội dung
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Bài học này hiện chưa được đính kèm video hoặc tài liệu học tập.
              </p>
            </div>
          )}

          {/* Description Section */}
          <div className="pt-2 border-t border-border/30">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Icon icon="lucide:align-left" className="size-4 text-muted-foreground" />
              Mô tả bài học
            </h4>
            {lesson.description?.trim() ? (
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {lesson.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Chưa có mô tả chi tiết cho bài học này.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
