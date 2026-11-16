'use client';

import React from 'react';
import Link from 'next/link';
import {
  type ISection,
  type ILessonMaterial,
  LessonContentTypeEnum,
  decodeUtf8FileName,
} from 'share-lib';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  useSectionLessonsQuery,
  useLessonDetailQuery,
  useUpdateLessonMutation,
} from '../api/course.api';
import { UploadLessonDocDialog } from './upload-lesson-doc-dialog';
import { DeleteLessonMaterialDialog } from './delete-lesson-material-dialog';
import { formatVideoDuration, getVideoLessonStats } from '../utils/course-lesson-stats.util';
import { getLessonUrl } from '../utils/course-view-mode.util';
import {
  formatFileSize,
  getMaterialFileConfig,
} from '../utils/lesson-material.util';

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
  readOnly?: boolean;
}

function formatExactLessonDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) return 'Chưa xác định';
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`.trim();
  }
  if (minutes > 0) {
    return `${minutes} phút`;
  }
  return '< 1 phút';
}

function formatVideoClock(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) return '00:00';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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
            {fileSizeText && <span>{fileSizeText}</span>}
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


interface LessonMaterialItemProps {
  material: ILessonMaterial;
  isPreview: boolean;
  onDelete?: (material: ILessonMaterial) => void;
}

function LessonMaterialItem({
  material,
  isPreview,
  onDelete,
}: LessonMaterialItemProps): React.JSX.Element {
  const displayTitle = decodeUtf8FileName(material.title || material.fileName);
  const displayFileName = decodeUtf8FileName(material.fileName);
  const fileSizeText = formatFileSize(material.fileSize);
  const fileConfig = getMaterialFileConfig(material.fileName, material.mimeType);

  return (
    <div className="group flex items-center justify-between p-2.5 bg-muted/30 hover:bg-muted/50 border border-border/40 hover:border-border/60 rounded-xl text-xs transition-all gap-2">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Biểu tượng file phân màu theo loại tệp */}
        <div
          className={`size-8 rounded-lg flex items-center justify-center shrink-0 border ${fileConfig.colorClass}`}
          title={fileConfig.tagText}
        >
          <Icon icon={fileConfig.icon} className="size-4" />
        </div>

        {/* Thông tin tên và dung lượng tệp */}
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-medium text-foreground truncate"
            title={displayTitle}
          >
            {displayTitle}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
            <span
              className="truncate max-w-[130px] text-muted-foreground/80"
              title={displayFileName}
            >
              {displayFileName}
            </span>
            {fileSizeText && (
              <>
                <span>•</span>
                <span>{fileSizeText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Kế thừa quyền xem theo video cha */}
        {isPreview ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-2xs select-none"
            title="Kế thừa từ bài học: Cho phép học thử"
          >
            <Icon icon="lucide:lock-open" className="size-2.5" />
            <span>Học thử</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 shadow-2xs select-none"
            title="Kế thừa từ bài học: Bị khóa theo video"
          >
            <Icon icon="lucide:lock" className="size-2.5" />
            <span>Đã khóa</span>
          </span>
        )}

        {/* Nút tải về */}
        {material.url && (
          <a
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            download={displayFileName}
            className="size-7 rounded-lg hover:bg-sky-500/10 text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Tải về tài liệu"
            aria-label="Tải về tài liệu"
          >
            <Icon icon="lucide:download" className="size-3.5" />
          </a>
        )}

        {/* Nút xóa tài liệu */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(material)}
            className="size-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
            title="Xóa tài liệu"
            aria-label="Xóa tài liệu"
          >
            <Icon icon="lucide:trash-2" className="size-3.5" />
          </button>
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
  readOnly = false,
}: {
  section: ISection;
  onEditChapter: (section: ISection) => void;
  onAddLesson: (section: ISection) => void;
  readOnly?: boolean;
}): React.JSX.Element {
  const { data: lessons, isLoading, isError } = useSectionLessonsQuery(section.id);
  const videoStats = getVideoLessonStats(lessons ?? []);
  const lessonCount = videoStats.videoCount;
  const durationText = formatVideoDuration(videoStats, 'long');

  // Lọc và tổng hợp tài liệu bài đọc & tài liệu đính kèm của chương
  const chapterDocuments = React.useMemo(() => {
    const list: Array<{
      id: string;
      fileName: string;
      fileSize?: number | null;
      url?: string;
      isPreview: boolean;
      lessonTitle: string;
    }> = [];

    (lessons ?? []).forEach((l) => {
      if (
        l.content &&
        l.content.type === LessonContentTypeEnum.DOCUMENT &&
        Boolean(l.content.fileName)
      ) {
        list.push({
          id: `content-${l.id}`,
          fileName: l.content.fileName || l.title || 'Tài liệu',
          fileSize: l.content.fileSize,
          url: l.content.url,
          isPreview: l.isPreview,
          lessonTitle: l.title,
        });
      }

      if (l.materials && l.materials.length > 0) {
        l.materials.forEach((m) => {
          list.push({
            id: m.id,
            fileName: m.fileName || m.title,
            fileSize: m.fileSize,
            url: m.url,
            isPreview: l.isPreview,
            lessonTitle: l.title,
          });
        });
      }
    });

    return list;
  }, [lessons]);

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Tổng quan chương
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {isError ? 'Không thể tải thống kê' : isLoading ? '...' : `${lessonCount} bài giảng`}
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
            {isError ? '—' : isLoading ? '...' : `${lessonCount} bài`}
          </p>
        </div>
        <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40 space-y-1">
          <span className="text-[14px] text-muted-foreground block font-medium leading-snug">
            Tổng thời lượng
          </span>
          <p className="text-base font-bold text-sky-600 dark:text-sky-400">
            {isError ? 'Không thể tải' : isLoading ? '...' : durationText}
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
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
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
                fileName={doc.fileName}
                fileSize={doc.fileSize}
                url={doc.url}
                isPreview={doc.isPreview}
                lessonTitle={doc.lessonTitle}
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
      {!readOnly && (
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
      )}
    </div>
  );
}

// 2. Lesson Inspector Component
function LessonInspectorView({
  lessonId,
  chapterTitle,
  courseId,
  readOnly = false,
}: {
  lessonId: string;
  chapterTitle: string;
  courseId: string;
  readOnly?: boolean;
}): React.JSX.Element {
  const { data: lesson, isLoading, isError, refetch } = useLessonDetailQuery(lessonId);
  const updateLessonMutation = useUpdateLessonMutation(courseId);

  const [targetDeleteMaterial, setTargetDeleteMaterial] = React.useState<ILessonMaterial | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);

  const handleTogglePreview = (targetIsPreview: boolean) => {
    if (!lesson || updateLessonMutation.isPending || lesson.isPreview === targetIsPreview) return;
    updateLessonMutation.mutate(
      {
        lessonId: lesson.id,
        payload: { isPreview: targetIsPreview },
      },
      {
        onSuccess: (updated) => {
          toast.success(
            updated.isPreview
              ? 'Đã chuyển bài học sang chế độ học thử miễn phí'
              : 'Đã chuyển bài học sang chế độ có phí (cần mua khóa học)',
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3 py-6 animate-pulse">
        <div className="h-4 w-1/3 bg-muted/60 rounded" />
        <div className="h-6 w-3/4 bg-muted/70 rounded" />
        <div className="h-16 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs space-y-2 text-center animate-in fade-in-50 duration-200">
        <Icon icon="lucide:alert-circle" className="size-5 mx-auto text-destructive" />
        <p className="font-semibold">Không thể tải thông tin bài học</p>
        <p className="text-[11px] text-muted-foreground">
          Vui lòng kiểm tra quyền truy cập hoặc thử lại.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetch();
          }}
          className="text-xs h-7 gap-1 mt-1 mx-auto"
        >
          <Icon icon="lucide:refresh-cw" className="size-3" />
          <span>Thử lại</span>
        </Button>
      </div>
    );
  }

  const isDocLesson =
    Boolean(lesson.content) &&
    lesson.content?.type === LessonContentTypeEnum.DOCUMENT;

  const durationClock = formatVideoClock(lesson.content?.duration);
  const lessonViewUrl = getLessonUrl(courseId, lesson.id);

  const materialsList = lesson.materials || [];
  const totalMaterialsCount = materialsList.length;

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Header: Loại bài giảng & Tiêu đề bài học */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/50">
          <Icon
            icon={isDocLesson ? 'lucide:file-text' : 'lucide:video'}
            className="size-3.5"
          />
          <span>{isDocLesson ? 'Tài liệu đọc' : 'Video bài giảng'}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug tracking-tight mt-2.5">
          {lesson.title}
        </h3>
      </div>

      {/* 2. Khung xem trước Bài học (16:9 Video/Doc Player Banner) */}
      <Link
        href={lessonViewUrl}
        className="block aspect-video w-full rounded-2xl overflow-hidden bg-zinc-950 relative border border-border/50 shadow-xs group cursor-pointer"
        title={isDocLesson ? 'Xem chi tiết tài liệu' : 'Xem trước bài giảng'}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
          <div className="size-14 rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Icon
              icon={isDocLesson ? 'lucide:file-text' : 'lucide:play'}
              className={cn('size-6 text-white', !isDocLesson && 'fill-current ml-0.5')}
            />
          </div>
          <span className="text-[11px] font-medium text-zinc-400 mt-2.5 group-hover:text-white transition-colors">
            {isDocLesson ? 'Xem chi tiết tài liệu' : 'Xem trước bài giảng'}
          </span>
        </div>

        {/* Digital Clock duration badge ở góc dưới bên phải (chỉ cho video) */}
        {!isDocLesson && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/75 backdrop-blur-md rounded-md text-[11px] font-mono font-medium text-white flex items-center gap-1.5 border border-white/10">
            <Icon icon="lucide:play" className="size-2.5 fill-current" />
            <span>{durationClock}</span>
          </div>
        )}
      </Link>

      {/* 3. Thẻ Hình thức truy cập (Access Mode Segmented Pill Card) */}
      <div className="bg-slate-50/70 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center shrink-0">
            <Icon icon="lucide:layers" className="size-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
              Hình thức truy cập
            </h4>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
              Thiết lập bài học này cho học thử hoặc có phí cho học viên.
            </p>
          </div>
        </div>

        {/* Segmented Pill Toggle Switch */}
        {!readOnly ? (
          <div className="inline-flex items-center p-1 bg-white dark:bg-zinc-800 rounded-full border border-slate-200 dark:border-zinc-700 shadow-2xs shrink-0">
            <button
              type="button"
              disabled={updateLessonMutation.isPending}
              onClick={() => handleTogglePreview(true)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                lesson.isPreview
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700/50',
                updateLessonMutation.isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              <Icon icon="lucide:gift" className="size-3.5 shrink-0" />
              <span>Học thử</span>
            </button>

            <button
              type="button"
              disabled={updateLessonMutation.isPending}
              onClick={() => handleTogglePreview(false)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                !lesson.isPreview
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700/50',
                updateLessonMutation.isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              <Icon icon="lucide:lock" className="size-3.5 shrink-0" />
              <span>Có phí</span>
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
            <Icon
              icon={lesson.isPreview ? 'lucide:gift' : 'lucide:lock'}
              className="size-3.5 shrink-0"
            />
            <span>{lesson.isPreview ? 'Học thử' : 'Có phí'}</span>
          </div>
        )}
      </div>

      {/* 4. Biên tập và tài liệu riêng chỉ dành cho bài giảng video */}
      {!isDocLesson && (
        <>
          {!readOnly && (
            <Link
              href={getLessonUrl(courseId, lesson.id, 'edit')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-700 transition text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs cursor-pointer"
              title="Biên tập Mindmap, Tóm tắt và câu hỏi của bài học"
            >
              <Icon icon="lucide:pencil" className="size-4" />
              <span>Biên tập nội dung bài học</span>
            </Link>
          )}

          <div className="space-y-2.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Icon icon="lucide:file-text" className="size-3.5 text-sky-500" />
                <span>Tài liệu riêng của bài</span>
                {totalMaterialsCount > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {totalMaterialsCount} tệp
                  </span>
                )}
              </h4>

              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="h-6 text-[11px] px-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:bg-sky-500/10 gap-1 rounded-lg"
                >
                  <Icon icon="lucide:plus" className="size-3" />
                  <span>Đính kèm tệp</span>
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              {materialsList.map((mat) => (
                <LessonMaterialItem
                  key={mat.id}
                  material={mat}
                  isPreview={lesson.isPreview}
                  onDelete={readOnly ? undefined : (m) => setTargetDeleteMaterial(m)}
                />
              ))}

              {totalMaterialsCount === 0 && (
                <div className="p-4 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-zinc-900/40 text-center">
                  <p className="text-xs text-muted-foreground italic">
                    Không có tài liệu riêng cho bài học này.
                  </p>
                </div>
              )}
            </div>
          </div>

          <UploadLessonDocDialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
            lesson={lesson}
            courseId={courseId}
          />

          <DeleteLessonMaterialDialog
            open={Boolean(targetDeleteMaterial)}
            onOpenChange={(open) => {
              if (!open) setTargetDeleteMaterial(null);
            }}
            lessonId={lesson.id}
            courseId={courseId}
            material={targetDeleteMaterial}
          />
        </>
      )}
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
  readOnly = false,
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
          readOnly={readOnly}
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
        readOnly={readOnly}
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
            Chọn một chương hoặc bài học để xem chi tiết.
          </p>
        </div>
      )}
    </Card>
  );
}
