'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { LessonMindmapTab } from './tabs/lesson-mindmap-tab';
import { LessonQuizTab } from './tabs/lesson-quiz-tab';
import { LessonSummaryTab } from './tabs/lesson-summary-tab';
import {
  useGenerateMindmapMutation,
  useGenerateQuizMutation,
  useGenerateSummaryMutation,
} from '../../api/transcript-analysis.api';

export interface TabConfig {
  id: 'summary' | 'mindmap' | 'quiz';
  tabNumber: string;
  title: string;
  icon: string;
  heading: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'summary',
    tabNumber: '1',
    title: 'Summary',
    icon: 'lucide:file-text',
    heading: 'Summary (Tóm tắt bài học)',
    description: 'Tóm tắt nội dung bài giảng, các điểm ghi nhớ cốt lõi (Key Points) và đúc kết sư phạm.',
  },
  {
    id: 'mindmap',
    tabNumber: '2',
    title: 'Mindmap',
    icon: 'lucide:network',
    heading: 'Mindmap (Sơ đồ tư duy)',
    description: 'Trực quan hóa kiến thức bài học dưới dạng sơ đồ tư duy phân nhánh có gắn mốc thời gian.',
  },
  {
    id: 'quiz',
    tabNumber: '3',
    title: 'Quizz',
    icon: 'lucide:help-circle',
    heading: 'Quizz (Câu hỏi trắc nghiệm)',
    description: 'Bộ 10 câu hỏi trắc nghiệm củng cố kiến thức xuất hiện theo dòng thời gian video.',
  },
];

export interface LessonTabsContainerProps {
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  onTestGemini?: (tabId: TabConfig['id']) => void;
}

export function LessonTabsContainer({
  lessonId,
  isInstructor = false,
  currentTime = 0,
  duration,
  onSeek,
  onTestGemini,
}: LessonTabsContainerProps): React.JSX.Element {
  const [activeTabId, setActiveTabId] = useState<TabConfig['id']>('summary');

  // AI Mutations for quick-trigger from tab bar buttons
  const { mutate: generateMindmap, isPending: isMindmapGenerating } =
    useGenerateMindmapMutation(lessonId);
  const { mutate: generateQuiz, isPending: isQuizGenerating } =
    useGenerateQuizMutation(lessonId);
  const { mutate: generateSummary, isPending: isSummaryGenerating } =
    useGenerateSummaryMutation(lessonId);

  const handleTestAi = (tabId: TabConfig['id']) => {
    setActiveTabId(tabId);
    if (onTestGemini) {
      onTestGemini(tabId);
      return;
    }

    if (tabId === 'mindmap') {
      generateMindmap({ saveAsDraft: true });
    } else if (tabId === 'quiz') {
      generateQuiz({ count: 10, saveAsDraft: true });
    } else if (tabId === 'summary') {
      generateSummary({ saveAsDraft: true });
    }
  };

  const getIsGenerating = (tabId: TabConfig['id']) => {
    if (tabId === 'mindmap') return isMindmapGenerating;
    if (tabId === 'quiz') return isQuizGenerating;
    if (tabId === 'summary') return isSummaryGenerating;
    return false;
  };

  return (
    <div className="w-full h-full flex flex-col bg-card min-h-0 overflow-hidden">
      {/* Horizontal Full-width 3-Segment Tab Bar */}
      <div className="shrink-0 border-b border-border bg-muted/20 grid grid-cols-3">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isTabGenerating = getIsGenerating(tab.id);

          return (
            <div
              key={tab.id}
              className={`group relative flex items-center justify-between py-2 sm:py-2.5 px-1.5 sm:px-3 md:px-4 border-b-2 transition-all ${
                isActive
                  ? 'border-sky-600 bg-background shadow-2xs'
                  : 'border-transparent hover:bg-muted/40'
              }`}
            >
              {/* Tab Switch Trigger */}
              <button
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 py-1 text-left cursor-pointer focus:outline-hidden ${
                  isActive
                    ? 'text-sky-700 dark:text-sky-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground font-semibold'
                }`}
              >
                <span
                  className={`size-5 sm:size-6 rounded-md flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold transition-colors shrink-0 ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-2xs'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                  }`}
                >
                  {tab.tabNumber}
                </span>
                <span className="truncate text-xs sm:text-sm">{tab.title}</span>
              </button>

              {/* Instructor Test Gemini API Button */}
              {isInstructor && (
                <button
                  type="button"
                  title={`Thử nghiệm sinh AI cho ${tab.title}`}
                  aria-label={`Thử nghiệm sinh AI cho ${tab.title}`}
                  disabled={isTabGenerating}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestAi(tab.id);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md text-[11px] font-medium border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-600 dark:hover:text-white active:scale-95 transition-all cursor-pointer shadow-2xs ml-1 disabled:opacity-60"
                >
                  <Icon
                    icon={isTabGenerating ? 'lucide:loader-2' : 'lucide:sparkles'}
                    className={`size-3 shrink-0 ${isTabGenerating ? 'animate-spin' : ''}`}
                  />
                  <span className="hidden sm:inline text-[10px] font-semibold tracking-tight">
                    {isTabGenerating ? 'Đang tạo...' : 'Test AI'}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tab Content Display Area */}
      <div className="flex-1 min-h-[360px] overflow-y-auto">
        {activeTabId === 'summary' && (
          <LessonSummaryTab
            lessonId={lessonId}
            isInstructor={isInstructor}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        )}

        {activeTabId === 'mindmap' && (
          <LessonMindmapTab
            lessonId={lessonId}
            isInstructor={isInstructor}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        )}

        {activeTabId === 'quiz' && (
          <LessonQuizTab
            lessonId={lessonId}
            isInstructor={isInstructor}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        )}
      </div>
    </div>
  );
}
