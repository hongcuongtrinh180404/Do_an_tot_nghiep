'use client';

import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ISection, ITranscribedSentence, LessonTranscriptionStatusEnum, type ILessonCompletionSummary } from 'share-lib';
import { TimelineMarker } from './lesson-video-screen';
import { LessonTimelineTab } from './lesson-timeline-tab';
import { LessonCurriculumTab } from './lesson-curriculum-tab';
import type { CourseViewMode } from '../../utils/course-view-mode.util';

type SubTabType = 'timeline' | 'curriculum';

const TAB_ORDER: SubTabType[] = ['timeline', 'curriculum'];

interface LessonNavSidebarProps {
  courseId: string;
  currentLessonId: string;
  mode?: CourseViewMode;
  timelineMarkers: TimelineMarker[];
  sentences?: ITranscribedSentence[];
  isTranscriptLoading?: boolean;
  transcriptionStatus?: LessonTranscriptionStatusEnum;
  onRetryTranscription?: () => void;
  isRetryingTranscription?: boolean;
  currentTime: number;
  duration: number;
  sections?: ISection[];
  onSeek: (seconds: number) => void;
  formatTime: (seconds: number) => string;
  onSelectLesson?: (lessonId: string) => void;
  onRefreshTranscription?: () => void;
  completions?: ILessonCompletionSummary[];
}

export function LessonNavSidebar({
  courseId,
  currentLessonId,
  mode = 'learn',
  timelineMarkers,
  sentences = [],
  isTranscriptLoading = false,
  transcriptionStatus,
  onRetryTranscription,
  isRetryingTranscription = false,
  currentTime,
  duration,
  sections,
  onSeek,
  formatTime,
  onSelectLesson,
  onRefreshTranscription,
  completions,
}: LessonNavSidebarProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('timeline');

  const tabRefs = useRef<Record<SubTabType, HTMLButtonElement | null>>({
    timeline: null,
    curriculum: null,
  });

  const hasSentences = sentences.length > 0;
  const timelineCount = hasSentences ? sentences.length : timelineMarkers.length;
  const timelineUnit = hasSentences ? 'câu' : 'mốc';
  const sectionCount = sections?.length ?? 0;

  const tabs: Array<{
    id: SubTabType;
    label: string;
    meta: string | null;
  }> = [
    {
      id: 'timeline',
      label: 'Dòng thời gian',
      meta: timelineCount > 0 ? `${timelineCount} ${timelineUnit}` : null,
    },
    {
      id: 'curriculum',
      label: 'Bài học',
      meta: sectionCount > 0 ? `${sectionCount} chương` : null,
    },
  ];

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentId: SubTabType,
  ) => {
    const currentIndex = TAB_ORDER.indexOf(currentId);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TAB_ORDER.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextId = TAB_ORDER[nextIndex];
    setActiveSubTab(nextId);
    tabRefs.current[nextId]?.focus();
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-card">
      {/* Sidebar tabs: the active underline is the only chrome the panel needs. */}
      <div className="shrink-0 border-b border-border px-3">
        <div
          role="tablist"
          aria-label="Nội dung bài học"
          aria-orientation="horizontal"
          className="flex items-stretch gap-4"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeSubTab;

            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element;
                }}
                type="button"
                role="tab"
                id={`lesson-sidebar-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`lesson-sidebar-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveSubTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                className={cn(
                  'relative flex shrink-0 cursor-pointer items-baseline gap-1.5 whitespace-nowrap pb-2.5 pt-3 text-[13px] transition-colors',
                  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  isActive
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{tab.label}</span>
                {tab.meta && (
                  <span className="text-[11px] font-normal tabular-nums text-muted-foreground">
                    {tab.meta}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors',
                    isActive ? 'bg-foreground' : 'bg-transparent',
                  )}
                />
              </button>
            );
          })}

          {/* Live position: keeps the current moment visible even when the list is scrolled away. */}
          {timelineCount > 0 && (
            <span
              aria-label={`Đang phát tại ${formatTime(currentTime)}`}
              className="ml-auto hidden shrink-0 items-center gap-1.5 pb-2.5 pt-3 text-[11px] font-medium tabular-nums text-muted-foreground min-[350px]:flex"
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-[#F02D01]"
              />
              <span>{formatTime(currentTime)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`lesson-sidebar-panel-${activeSubTab}`}
        aria-labelledby={`lesson-sidebar-tab-${activeSubTab}`}
        className="min-h-0 flex-1 overflow-hidden"
      >
        {activeSubTab === 'timeline' ? (
          <LessonTimelineTab
            sentences={sentences}
            fallbackMarkers={timelineMarkers}
            currentTime={currentTime}
            duration={duration}
            isLoading={isTranscriptLoading}
            transcriptionStatus={transcriptionStatus}
            onSeek={onSeek}
            formatTime={formatTime}
            onRetryTranscription={onRetryTranscription}
            isRetrying={isRetryingTranscription}
            onRefresh={onRefreshTranscription}
          />
        ) : (
          <LessonCurriculumTab
            courseId={courseId}
            currentLessonId={currentLessonId}
            mode={mode}
            sections={sections}
            onSelectLesson={onSelectLesson}
            formatTime={formatTime}
            completions={completions}
          />
        )}
      </div>
    </div>
  );
}
