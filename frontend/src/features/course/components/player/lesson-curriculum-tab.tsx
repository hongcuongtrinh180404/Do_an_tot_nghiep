'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { ISection, LessonContentTypeEnum } from 'share-lib';
import { useSectionLessonsQuery } from '../../api/course.api';

interface SectionItemRowProps {
  section: ISection;
  currentLessonId: string;
  onLessonClick: (lessonId: string) => void;
  formatTime: (seconds: number) => string;
}

function SectionItemRow({
  section,
  currentLessonId,
  onLessonClick,
  formatTime,
}: SectionItemRowProps): React.JSX.Element {
  const { data: lessons, isLoading } = useSectionLessonsQuery(section.id);
  const lessonList = lessons ?? [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Section Header */}
      <div className="px-3 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-semibold text-foreground">
        <span className="line-clamp-1">{section.title}</span>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
          {isLoading ? '...' : `${lessonList.length} bài`}
        </span>
      </div>

      {/* Lessons List inside Section */}
      <div className="p-1.5 space-y-1">
        {lessonList.length === 0 && !isLoading && (
          <div className="text-[11px] text-muted-foreground italic px-2 py-1.5">
            Chưa có bài học nào trong chương này
          </div>
        )}

        {lessonList.map((les) => {
          const isActive = les.id === currentLessonId;

          return (
            <button
              key={les.id}
              type="button"
              onClick={() => onLessonClick(les.id)}
              className={`w-full text-left p-2 rounded-lg transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer group ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-100 font-bold shadow-2xs ring-1 ring-sky-500/20'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              {/* Left Icon & Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Status Icon */}
                <div className="shrink-0">
                  {isActive ? (
                    <div className="size-6 rounded-md bg-sky-500 text-white flex items-center justify-center shadow-xs">
                      <Icon icon="lucide:play" className="size-3 fill-current" />
                    </div>
                  ) : les.isPreview ? (
                    <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Icon icon="lucide:sparkles" className="size-3" />
                    </div>
                  ) : (
                    <div className="size-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center group-hover:text-foreground">
                      <Icon
                        icon={
                          les.content?.type === LessonContentTypeEnum.DOCUMENT
                            ? 'lucide:file-text'
                            : 'lucide:video'
                        }
                        className="size-3"
                      />
                    </div>
                  )}
                </div>

                {/* Lesson Title */}
                <div className="min-w-0">
                  <p
                    className={`text-xs line-clamp-1 ${
                      isActive ? 'text-sky-900 dark:text-sky-200 font-bold' : 'text-foreground'
                    }`}
                  >
                    {les.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {les.content?.duration ? (
                      <span>{formatTime(les.content.duration)}</span>
                    ) : (
                      <span>Tài liệu</span>
                    )}
                    {les.isPreview && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        • Học thử
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Active Indicator */}
              {isActive && (
                <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 px-1.5 py-0.5 rounded shrink-0">
                  Đang phát
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface LessonCurriculumTabProps {
  courseId: string;
  currentLessonId: string;
  sections?: ISection[];
  onSelectLesson?: (lessonId: string) => void;
  formatTime: (seconds: number) => string;
}

export function LessonCurriculumTab({
  courseId,
  currentLessonId,
  sections,
  onSelectLesson,
  formatTime,
}: LessonCurriculumTabProps): React.JSX.Element {
  const router = useRouter();

  const handleLessonClick = (lessonId: string) => {
    if (lessonId === currentLessonId) return;

    if (onSelectLesson) {
      onSelectLesson(lessonId);
    } else {
      router.push(`/instructor/courses/${courseId}/lessons/${lessonId}`);
    }
  };

  if (!sections || sections.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 text-muted-foreground">
        <div className="size-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <Icon icon="lucide:book-open" className="size-6" />
        </div>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Chưa có danh sách chương học nào cho khóa học này.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {sections.map((sec) => (
        <SectionItemRow
          key={sec.id}
          section={sec}
          currentLessonId={currentLessonId}
          onLessonClick={handleLessonClick}
          formatTime={formatTime}
        />
      ))}
    </div>
  );
}
