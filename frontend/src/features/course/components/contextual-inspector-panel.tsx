'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { type ISection, LessonContentTypeEnum, decodeUtf8FileName } from 'share-lib';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useSectionLessonsQuery, useLessonDetailQuery } from '../api/course.api';
import {
  deserializeKeyPoints,
  getKeyPointColor,
} from '../utils/lesson-key-points.util';

export type ContextSelection =
  | { type: 'chapter'; chapterId: string }
  | { type: 'lesson'; lessonId: string; chapterId: string }
  | null;

interface ContextualInspectorPanelProps {
  selection: ContextSelection;
  sections: ISection[];
  courseId: string;
  onEditChapter: (section: ISection) => void;
  onAddLesson: (section: ISection) => void;
}

function formatMinutes(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) return '0 phút';
  const totalMins = Math.round(seconds / 60);
  if (totalMins >= 60) {
    const hours = Math.floor(totalMins / 60);
    const remMins = totalMins % 60;
    return remMins > 0 ? `${hours} giờ ${remMins} phút` : `${hours} giờ`;
  }
  return `${totalMins} phút`;
}

function formatExactLessonDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) return 'Chưa xác định';
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remSecs = rounded % 60;
  if (minutes > 0) {
    return `${minutes} phút ${remSecs > 0 ? `${remSecs} giây` : ''}`.trim();
  }
  return `${remSecs} giây`;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// Reusable Document Item with Access Status Badge & Icon
interface DocumentItemWithStatusProps {
  fileName: string;
  fileSize?: number | null;
  url?: string;
  isPreview: boolean;
  lessonTitle?: string;
}

function DocumentItemWithStatus({
  fileName,
  fileSize,
  url,
  isPreview,
  lessonTitle,
}: DocumentItemWithStatusProps): React.JSX.Element {
  const displayFileName = decodeUtf8FileName(fileName);
  const displayLessonTitle = decodeUtf8FileName(lessonTitle);
  const fileSizeText = formatFileSize(fileSize);

  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl text-xs transition-colors gap-1.5">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Icon icon="lucide:file-text" className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate" title={displayFileName}>
            {displayFileName}
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
            {fileSizeText && <span className="font-mono">{fileSizeText}</span>}
            {displayLessonTitle && (
              <>
                <span>•</span>
                <span className="truncate max-w-[90px]" title={displayLessonTitle}>
                  {displayLessonTitle}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:bg-sky-500/10 rounded-md transition-colors"
            title="Mở tệp trong tab mới"
          >
            <span>Mở</span>
            <Icon icon="lucide:external-link" className="size-2.5" />
          </a>
        )}

        {/* Access Status Icon & Badge */}
        {isPreview ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-2xs select-none"
            title="Tài liệu mở công khai (Học viên chưa mua vẫn xem hoặc tải được)"
          >
            <Icon icon="lucide:lock-open" className="size-2.5" />
            <span>Học thử</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 shadow-2xs select-none"
            title="Tài liệu độc quyền bị khóa (Chỉ học viên đã mua khóa học mới xem được)"
          >
            <Icon icon="lucide:lock" className="size-2.5" />
            <span>Đã khóa</span>
          </span>
        )}
      </div>
    </div>
  );
}

// 1. Chapter Inspector Component
function ChapterInspectorView({
  section,
  onEditChapter,
  onAddLesson,
}: {
  section: ISection;
  onEditChapter: (section: ISection) => void;
  onAddLesson: (section: ISection) => void;
}): React.JSX.Element {
  const { data: lessons, isLoading } = useSectionLessonsQuery(section.id);
  const lessonCount = lessons ? lessons.length : 0;
  const totalSeconds = (lessons ?? []).reduce(
    (acc, curr) => acc + (curr.content?.duration ?? 0),
    0,
  );
  const durationText = formatMinutes(totalSeconds);

  // Lọc riêng các tài liệu bài đọc / tài liệu chữ của chương (loại trừ video)
  const chapterDocuments = (lessons ?? []).filter(
    (l) =>
      l.content &&
      l.content.type === LessonContentTypeEnum.DOCUMENT &&
      Boolean(l.content.fileName),
  );

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Tổng quan chương
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {isLoading ? '...' : `${lessonCount} bài giảng`}
        </span>
      </div>

      {/* Chapter Title & Description */}
      <div>
        <h3 className="text-base font-bold text-foreground leading-snug">
          {section.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {section.description?.trim() || 'Chưa có mô tả mục tiêu cho chương này.'}
        </p>
      </div>

      {/* 2 Quick Stat Cards */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40 space-y-1">
          <span className="text-[14px] text-muted-foreground block font-medium leading-snug">
            Số bài giảng thực tế
          </span>
          <p className="text-base font-bold text-foreground">
            {isLoading ? '...' : `${lessonCount} bài`}
          </p>
        </div>
        <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40 space-y-1">
          <span className="text-[14px] text-muted-foreground block font-medium leading-snug">
            Tổng thời lượng
          </span>
          <p className="text-base font-bold text-sky-600 dark:text-sky-400">
            {isLoading ? '...' : durationText}
          </p>
        </div>
      </div>

      {/* Tài liệu chung của chương (Cấp 4) */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Icon icon="lucide:folder-open" className="size-3.5 text-amber-500" />
            <span>Tài liệu chung của chương</span>
          </h4>
          {chapterDocuments.length > 0 && (
            <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {chapterDocuments.length} tệp
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center animate-pulse">
            <p className="text-xs text-muted-foreground">Đang tải tài liệu...</p>
          </div>
        ) : chapterDocuments.length > 0 ? (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
            {chapterDocuments.map((doc) => (
              <DocumentItemWithStatus
                key={doc.id}
                fileName={doc.content?.fileName || doc.title}
                fileSize={doc.content?.fileSize}
                url={doc.content?.url}
                isPreview={doc.isPreview}
                lessonTitle={doc.title}
              />
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center">
            <p className="text-xs text-muted-foreground italic">
              Chưa có tài liệu đính kèm chung cho chương này.
            </p>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="pt-2 flex items-center gap-2 border-t border-border/40">
        <Button
          type="button"
          size="sm"
          onClick={() => onAddLesson(section)}
          className="flex-1 text-xs h-8.5 gap-1.5"
        >
          <Icon icon="lucide:plus" className="size-3.5" />
          <span>Thêm bài học</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEditChapter(section)}
          className="text-xs h-8.5 gap-1.5 border-border/60"
        >
          <Icon icon="lucide:pencil" className="size-3" />
          <span>Sửa chương</span>
        </Button>
      </div>
    </div>
  );
}

// 2. Lesson Inspector Component
function LessonInspectorView({
  lessonId,
  chapterTitle,
  courseId,
}: {
  lessonId: string;
  chapterTitle: string;
  courseId: string;
}): React.JSX.Element {
  const router = useRouter();
  const { data: lesson, isLoading } = useLessonDetailQuery(lessonId);

  if (isLoading || !lesson) {
    return (
      <div className="space-y-3 py-6 animate-pulse">
        <div className="h-4 w-1/3 bg-muted/60 rounded" />
        <div className="h-6 w-3/4 bg-muted/70 rounded" />
        <div className="h-16 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  const isDocLesson =
    Boolean(lesson.content) &&
    lesson.content?.type === LessonContentTypeEnum.DOCUMENT;

  const durationText = formatExactLessonDuration(lesson.content?.duration);
  const headerSubtitle = isDocLesson
    ? 'Tài liệu đọc'
    : durationText !== 'Chưa xác định'
      ? durationText
      : 'Video bài giảng';
  const lessonViewUrl = `/instructor/courses/${courseId}/lessons/${lesson.id}`;

  const keyPoints = deserializeKeyPoints(lesson.description);

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
          Chi tiết bài học
        </span>
        <span className="text-xs text-muted-foreground font-medium">{headerSubtitle}</span>
      </div>

      {/* Lesson Title & Breadcrumb */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1 truncate">{chapterTitle}</div>
        <h3 className="text-base font-bold text-foreground leading-snug">{lesson.title}</h3>
        {keyPoints.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Ý cốt lõi bài học ({keyPoints.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {keyPoints.map((point, index) => {
                const color = getKeyPointColor(index);
                return (
                  <span
                    key={point.id}
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium text-slate-800 shadow-2xs"
                  >
                    <span
                      style={{ backgroundColor: color.dot }}
                      className="size-1.5 rounded-full shrink-0"
                      aria-hidden="true"
                    />
                    <span className="line-clamp-1 max-w-[200px]">{point.text}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {lesson.description?.trim() || 'Chưa có mô tả chi tiết cho bài học này.'}
          </p>
        )}
      </div>

      {/* Khung xem trước Bài học (Media Banner) */}
      <div className="bg-zinc-950 rounded-xl p-4 text-white space-y-2 border border-border/40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Trạng thái phát</span>
          <span
            className={`${
              lesson.isPreview ? 'text-emerald-400' : 'text-amber-400'
            } font-semibold flex items-center gap-1`}
          >
            <Icon
              icon={lesson.isPreview ? 'lucide:lock-open' : 'lucide:lock'}
              className="size-3"
            />
            {lesson.isPreview ? 'Cho phép học thử' : 'Cần mua khóa học'}
          </span>
        </div>

        <div
          onClick={() => router.push(lessonViewUrl)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(lessonViewUrl);
            }
          }}
          className="flex items-center justify-center py-4 bg-zinc-900 rounded-lg cursor-pointer hover:bg-zinc-800 transition group"
        >
          <Icon
            icon={isDocLesson ? 'lucide:file-text' : 'lucide:play-circle'}
            className="size-6 text-sky-400 mr-2 group-hover:scale-110 transition-transform"
          />
          <span className="text-xs font-bold">
            {isDocLesson ? 'Xem chi tiết tài liệu' : 'Xem trước bài giảng'}
          </span>
        </div>
      </div>

      {/* Tài liệu riêng của bài (Cấp 4) */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Icon icon="lucide:file-text" className="size-3.5 text-sky-500" />
          <span>Tài liệu riêng của bài</span>
        </h4>
        <div className="space-y-1.5">
          {isDocLesson && lesson.content?.fileName ? (
            <DocumentItemWithStatus
              fileName={lesson.content.fileName}
              fileSize={lesson.content.fileSize}
              url={lesson.content.url}
              isPreview={lesson.isPreview}
            />
          ) : (
            <p className="text-xs text-muted-foreground/80 italic p-3 bg-muted/20 border border-border/40 rounded-xl text-center">
              Không có tài liệu riêng cho bài học này.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Main Contextual Inspector Container
export function ContextualInspectorPanel({
  selection,
  sections,
  courseId,
  onEditChapter,
  onAddLesson,
}: ContextualInspectorPanelProps): React.JSX.Element {
  let content: React.ReactNode;

  if (selection?.type === 'chapter') {
    const section = sections.find((s) => s.id === selection.chapterId);
    if (section) {
      content = (
        <ChapterInspectorView
          section={section}
          onEditChapter={onEditChapter}
          onAddLesson={onAddLesson}
        />
      );
    }
  } else if (selection?.type === 'lesson') {
    const section = sections.find((s) => s.id === selection.chapterId);
    content = (
      <LessonInspectorView
        lessonId={selection.lessonId}
        chapterTitle={section?.title || 'Bài giảng khóa học'}
        courseId={courseId}
      />
    );
  }

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xs shadow-xs overflow-hidden p-4 sm:p-4.5 transition-all duration-200">
      {content || (
        <div className="text-center py-12 text-muted-foreground space-y-2">
          <Icon
            icon="lucide:mouse-pointer-click"
            className="size-8 text-muted-foreground/50 mx-auto"
          />
          <p className="text-xs font-medium max-w-[240px] mx-auto leading-relaxed">
            Chọn một Chương hoặc Bài học ở danh sách bên trái để hiển thị thông tin chi tiết và tài liệu đính kèm.
          </p>
        </div>
      )}
    </Card>
  );
}
