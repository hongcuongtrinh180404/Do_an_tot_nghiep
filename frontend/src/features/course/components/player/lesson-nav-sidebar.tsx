'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { ISection } from 'share-lib';
import { TimelineMarker } from './lesson-video-screen';
import { LessonTimelineTab } from './lesson-timeline-tab';
import { LessonCurriculumTab } from './lesson-curriculum-tab';

type SubTabType = 'timeline' | 'curriculum';

interface LessonNavSidebarProps {
  courseId: string;
  currentLessonId: string;
  timelineMarkers: TimelineMarker[];
  currentTime: number;
  duration: number;
  sections?: ISection[];
  onSeek: (seconds: number) => void;
  formatTime: (seconds: number) => string;
  onSelectLesson?: (lessonId: string) => void;
}

export function LessonNavSidebar({
  courseId,
  currentLessonId,
  timelineMarkers,
  currentTime,
  duration,
  sections,
  onSeek,
  formatTime,
  onSelectLesson,
}: LessonNavSidebarProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('timeline');

  return (
    <div className="w-full h-full flex flex-col bg-card min-h-0 overflow-hidden">
      {/* 2 Sub-Tabs Top Header Bar */}
      <div className="shrink-0 p-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
        {/* Tab Timeline */}
        <button
          type="button"
          onClick={() => setActiveSubTab('timeline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'timeline'
              ? 'bg-card text-sky-700 dark:text-sky-400 border border-border shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Icon icon="lucide:clock" className="size-3.5" />
          <span>Timeline</span>
          {timelineMarkers.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSubTab === 'timeline'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-semibold'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {timelineMarkers.length}
            </span>
          )}
        </button>

        {/* Tab Video (Curriculum) */}
        <button
          type="button"
          onClick={() => setActiveSubTab('curriculum')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'curriculum'
              ? 'bg-card text-sky-700 dark:text-sky-400 border border-border shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Icon icon="lucide:film" className="size-3.5" />
          <span>Video</span>
        </button>
      </div>

      {/* Sub-Tab Content Viewport */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSubTab === 'timeline' ? (
          <LessonTimelineTab
            markers={timelineMarkers}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            formatTime={formatTime}
          />
        ) : (
          <LessonCurriculumTab
            courseId={courseId}
            currentLessonId={currentLessonId}
            sections={sections}
            onSelectLesson={onSelectLesson}
            formatTime={formatTime}
          />
        )}
      </div>
    </div>
  );
}
