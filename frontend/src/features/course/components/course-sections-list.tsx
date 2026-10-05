'use client';

import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ISection, ILesson } from 'share-lib';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  useCourseSectionsQuery,
  useSectionLessonsQuery,
  useReorderSectionsMutation,
} from '../api/course.api';
import { useChapterDnd } from '../hooks/use-chapter-dnd';
import { CreateSectionDialog } from './create-section-dialog';
import { EditSectionDialog } from './edit-section-dialog';
import { DeleteSectionDialog } from './delete-section-dialog';
import { SectionLessonCreateForm } from './section-lesson-create-form';
import { CourseOverviewMetrics } from './course-overview-metrics';
import {
  ContextualInspectorPanel,
  type ContextSelection,
} from './contextual-inspector-panel';
import {
  CourseViewModeSwitcher,
  type CourseViewMode,
} from './course-view-mode-switcher';
import { CourseMindmapView } from './mindmap/course-mindmap-view';

interface CourseSectionsListProps {
  courseId: string;
}

function formatMinutes(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) return '0p';
  const totalMins = Math.round(seconds / 60);
  if (totalMins >= 60) {
    const hours = Math.floor(totalMins / 60);
    const remMins = totalMins % 60;
    return remMins > 0 ? `${hours}h ${remMins}p` : `${hours}h`;
  }
  return `${totalMins}p`;
}

interface ChapterTreeItemProps {
  section: ISection;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isChapterSelected: boolean;
  selectedLessonId?: string;
  onSelectChapter: () => void;
  onSelectLesson: (lesson: ILesson) => void;
  onEditChapter: () => void;
  onDeleteChapter?: () => void;
  isDeletingChapter?: boolean;
  onAddLesson: () => void;
  // Drag & Drop
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

function ChapterTreeItem({
  section,
  index,
  isExpanded,
  onToggleExpand,
  isChapterSelected,
  selectedLessonId,
  onSelectChapter,
  onSelectLesson,
  onEditChapter,
  onDeleteChapter,
  isDeletingChapter = false,
  onAddLesson,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ChapterTreeItemProps): React.JSX.Element {
  const { data: lessons, isLoading } = useSectionLessonsQuery(section.id);
  const lessonList = lessons ?? [];
  const totalSeconds = lessonList.reduce(
    (acc, curr) => acc + (curr.content?.duration ?? 0),
    0,
  );
  const durationText = formatMinutes(totalSeconds);
  const displayChapterIndex = String(index + 1).padStart(2, '0');

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`rounded-2xl border transition-all shadow-xs overflow-hidden ${
        isDragging
          ? 'opacity-40 scale-[0.99] border-dashed border-sky-500/60 shadow-lg'
          : isDragOver
            ? 'border-2 border-dashed border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
            : isChapterSelected
              ? 'border-sky-500 ring-2 ring-sky-500/15 bg-card'
              : 'border-border/60 bg-card hover:border-border/80'
      }`}
    >
      {/* Chapter Header Row */}
      <div
        onClick={onSelectChapter}
        className={`p-3.5 sm:p-4 cursor-pointer border-b border-border/30 flex items-center justify-between gap-3 transition-colors ${
          isChapterSelected ? 'bg-sky-500/5' : 'bg-muted/15 hover:bg-muted/25'
        }`}
      >
        <div className="flex items-center space-x-2.5 flex-1 min-w-0">
          {/* Drag Handle Grip Icon */}
          <div
            className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-md hover:bg-muted/60 transition-colors shrink-0"
            title="Kéo thả để sắp xếp thứ tự chương học"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon icon="lucide:grip-vertical" className="size-4" />
          </div>

          {/* Chevron Collapse Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors shrink-0"
            title={isExpanded ? 'Thu gọn chương' : 'Mở rộng chương'}
          >
            <Icon
              icon="lucide:chevron-right"
              className={`size-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-90 text-sky-600 dark:text-sky-400' : ''
              }`}
            />
          </button>

          {/* Chapter Number Badge & Title & Metrics Badge */}
          <div className="truncate flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded shrink-0">
                CHƯƠNG {displayChapterIndex}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {section.title}
              </h3>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/50 px-2 py-0.5 rounded-full shrink-0">
                {isLoading ? '...' : `${lessonList.length} bài • ${durationText}`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center space-x-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onAddLesson}
            className="px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 rounded-lg transition"
          >
            <Icon icon="lucide:plus" className="size-3 inline mr-1" />
            <span>Thêm bài</span>
          </button>

          <button
            type="button"
            onClick={onEditChapter}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
            title="Chỉnh sửa chương"
          >
            <Icon icon="lucide:pencil" className="size-3.5" />
          </button>

          {/* Nút Xóa chương học (UI Only) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChapter?.();
            }}
            disabled={isDeletingChapter}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Xóa chương học"
            aria-label="Xóa chương học"
          >
            {isDeletingChapter ? (
              <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
            ) : (
              <Icon icon="lucide:trash-2" className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Child Lessons List (Cấp 3) */}
      {isExpanded && (
        <div className="divide-y divide-border/20 bg-card/40">
          {isLoading && (
            <div className="py-3 px-8 text-xs text-muted-foreground animate-pulse">
              Đang tải danh sách bài học...
            </div>
          )}

          {!isLoading && lessonList.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground italic">
              Chưa có bài học nào trong chương này.
            </div>
          )}

          {!isLoading &&
            lessonList.map((lesson) => {
              const isLessonSelected = selectedLessonId === lesson.id;
              const isVideo = lesson.content?.type === 'video';
              const lessonDuration = formatMinutes(lesson.content?.duration);

              return (
                <div
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson)}
                  className={`p-3 pl-8 sm:pl-10 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isLessonSelected
                      ? 'bg-sky-500/10 border-l-4 border-sky-600 text-sky-950 dark:text-sky-100 font-semibold'
                      : 'hover:bg-muted/30 text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Lesson Type Icon */}
                    <span
                      className={`size-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                        isVideo
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <Icon
                        icon={isVideo ? 'lucide:video' : 'lucide:file-text'}
                        className="size-3.5"
                      />
                    </span>

                    {/* Lesson Title & Badges */}
                    <div className="truncate flex-1 min-w-0">
                      <p className="truncate flex items-center gap-2">
                        <span className="truncate">{lesson.title}</span>
                        {lesson.isPreview && (
                          <span className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded shrink-0">
                            Học thử
                          </span>
                        )}
                      </p>
                    </div>

                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {lessonDuration}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function CourseSectionsListContent({ courseId }: CourseSectionsListProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawView = searchParams.get('view');
  const viewMode: CourseViewMode = rawView === 'mindmap' ? 'mindmap' : 'tree';

  const handleViewModeChange = (mode: CourseViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'tree') {
      params.delete('view');
    } else {
      params.set('view', mode);
    }
    const newQuery = params.toString() ? `?${params.toString()}` : '';
    router.replace(`${pathname}${newQuery}`, { scroll: false });
  };

  const { data: sections, isLoading, isError, refetch } = useCourseSectionsQuery(courseId);
  const reorderMutation = useReorderSectionsMutation(courseId);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editSectionTarget, setEditSectionTarget] = useState<ISection | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<ISection | null>(null);
  const [createLessonTarget, setCreateLessonTarget] = useState<{
    sectionId: string;
    sectionTitle: string;
  } | null>(null);

  // Expanded chapters state: Record<chapterId, boolean> (All collapsed by default!)
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Context Selection state (type: 'chapter' | 'lesson')
  const [selection, setSelection] = useState<ContextSelection>(null);

  const sectionList = sections ?? [];
  const nextOrder = sectionList.length;

  const {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useChapterDnd({
    sections: sectionList,
    onReorder: (newOrderIds) => {
      void reorderMutation.mutateAsync({ sectionIds: newOrderIds });
    },
  });

  // Compute effective selection (fallback to first chapter if none explicitly chosen)
  const effectiveSelection: ContextSelection =
    selection ?? (sectionList.length > 0 ? { type: 'chapter', chapterId: sectionList[0].id } : null);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Overview Metrics Bar */}
      <CourseOverviewMetrics
        totalChapters={sectionList.length}
        totalLessons={sectionList.length * 3} // Dynamic visual default before deep summation
        totalDurationText="2h 15p"
      />

      {/* View Mode Switcher Centered in Whitespace */}
      <div className="flex justify-center pt-1 pb-1">
        <CourseViewModeSwitcher
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
        />
      </div>

      {/* 2. Main Content: Split View Grid (Tree) OR Interactive Mindmap Canvas */}
      {viewMode === 'mindmap' ? (
        <CourseMindmapView
          courseId={courseId}
          sections={sectionList}
          onBackToTree={() => handleViewModeChange('tree')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[62fr_38fr] gap-6 items-start">
        {/* CỘT TRÁI (62%): CÂY PHÂN CẤP CHƯƠNG & BÀI HỌC */}
        <div className="min-w-0 space-y-4">
          {/* Header Card */}
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-foreground">Cấu trúc giáo trình</h2>
              <p className="text-[11px] text-muted-foreground">
                Kéo thả icon để đổi thứ tự. Click vào Chương hoặc Bài học để xem chi tiết bên phải.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="text-xs font-semibold h-8 rounded-xl shadow-xs"
            >
              <Icon icon="lucide:plus" className="size-3.5 mr-1" />
              Thêm chương
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-border/40 bg-card/50 animate-pulse space-y-2"
                >
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted/60 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && isError && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-xs">
              <span className="flex items-center gap-2">
                <Icon icon="lucide:alert-circle" className="size-4 shrink-0" />
                Không thể tải danh sách chương học từ máy chủ.
              </span>
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs' })}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && sectionList.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border-2 border-dashed border-border/60 p-6 space-y-2">
              <Icon icon="lucide:box" className="size-8 text-muted-foreground/60 mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">
                Chưa có nội dung giảng dạy. Bắt đầu bằng cách thêm chương đầu tiên.
              </p>
            </div>
          )}

          {/* Success State: Dynamic Collapsible Tree */}
          {!isLoading && !isError && sectionList.length > 0 && (
            <div className="space-y-3">
              {sectionList.map((section, index) => {
                const isChapterSelected =
                  effectiveSelection?.type === 'chapter' && effectiveSelection.chapterId === section.id;
                const selectedLessonId =
                  effectiveSelection?.type === 'lesson' && effectiveSelection.chapterId === section.id
                    ? effectiveSelection.lessonId
                    : undefined;

                return (
                  <ChapterTreeItem
                    key={section.id}
                    section={section}
                    index={index}
                    isExpanded={Boolean(expandedChapters[section.id])}
                    onToggleExpand={() => toggleChapter(section.id)}
                    isChapterSelected={isChapterSelected}
                    selectedLessonId={selectedLessonId}
                    onSelectChapter={() =>
                      setSelection({ type: 'chapter', chapterId: section.id })
                    }
                    onSelectLesson={(lesson) =>
                      setSelection({
                        type: 'lesson',
                        lessonId: lesson.id,
                        chapterId: section.id,
                      })
                    }
                    onEditChapter={() => setEditSectionTarget(section)}
                    onDeleteChapter={() => setDeleteSectionTarget(section)}
                    onAddLesson={() =>
                      setCreateLessonTarget({
                        sectionId: section.id,
                        sectionTitle: section.title,
                      })
                    }
                    isDragging={draggedIndex === index}
                    isDragOver={dragOverIndex === index}
                    onDragStart={(e) => handleDragStart(index, e)}
                    onDragOver={(e) => handleDragOver(index, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(index, e)}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (38%): BẢNG THÔNG TIN NGỮ CẢNH (CONTEXTUAL INSPECTOR PANEL) */}
        <div className="min-w-0 sticky top-20">
          <ContextualInspectorPanel
            selection={effectiveSelection}
            sections={sectionList}
            courseId={courseId}
            onEditChapter={(s) => setEditSectionTarget(s)}
            onAddLesson={(s) =>
              setCreateLessonTarget({
                sectionId: s.id,
                sectionTitle: s.title,
              })
            }
          />
        </div>
      </div>
      )}

      {/* Modal: Thêm chương mới */}
      <CreateSectionDialog
        courseId={courseId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultOrder={nextOrder}
      />

      {/* Modal: Chỉnh sửa chương */}
      <EditSectionDialog
        section={editSectionTarget}
        open={Boolean(editSectionTarget)}
        onOpenChange={(open) => {
          if (!open) setEditSectionTarget(null);
        }}
      />

      {/* Modal: Xóa chương học (Mock UI) */}
      <DeleteSectionDialog
        section={deleteSectionTarget}
        open={Boolean(deleteSectionTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteSectionTarget(null);
        }}
      />

      {/* Modal: Thêm bài học mới */}
      <SectionLessonCreateForm
        open={Boolean(createLessonTarget)}
        onOpenChange={(open) => {
          if (!open) setCreateLessonTarget(null);
        }}
        sectionId={createLessonTarget?.sectionId ?? ''}
        sectionTitle={createLessonTarget?.sectionTitle}
      />
    </div>
  );
}

export function CourseSectionsList({ courseId }: CourseSectionsListProps): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-card/50 rounded-2xl border border-border/40" />
            ))}
          </div>
          <div className="h-10 w-64 bg-slate-100 rounded-full mx-auto" />
          <div className="h-64 bg-card/50 rounded-2xl border border-border/40" />
        </div>
      }
    >
      <CourseSectionsListContent courseId={courseId} />
    </React.Suspense>
  );
}
