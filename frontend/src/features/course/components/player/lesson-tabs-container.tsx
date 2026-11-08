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
  title: string;
  icon: string;
  badge?: string;
  heading: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'summary',
    title: 'Tóm tắt (Summary)',
    icon: 'lucide:file-text',
    heading: 'Summary (Tóm tắt bài học)',
    description: 'Tóm tắt nội dung bài giảng, các điểm ghi nhớ cốt lõi (Key Points) và đúc kết sư phạm.',
  },
  {
    id: 'mindmap',
    title: 'Sơ đồ tư duy (Mindmap)',
    icon: 'lucide:network',
    heading: 'Mindmap (Sơ đồ tư duy)',
    description: 'Trực quan hóa kiến thức bài học dưới dạng sơ đồ tư duy phân nhánh có gắn mốc thời gian.',
  },
  {
    id: 'quiz',
    title: 'Trắc nghiệm (Quiz)',
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

  const handleTriggerAiForActiveTab = (tabId: TabConfig['id']) => {
    if (!isInstructor) return;

    if (onTestGemini) {
      onTestGemini(tabId);
      return;
    }

    if (tabId === 'mindmap') {
      generateMindmap({ saveAsDraft: false });
    } else if (tabId === 'quiz') {
      generateQuiz({ count: 10, saveAsDraft: false });
    } else if (tabId === 'summary') {
      generateSummary({ saveAsDraft: false });
    }
  };

  const getIsGenerating = (tabId: TabConfig['id']) => {
    if (tabId === 'mindmap') return isMindmapGenerating;
    if (tabId === 'quiz') return isQuizGenerating;
    if (tabId === 'summary') return isSummaryGenerating;
    return false;
  };

  const getAiButtonText = (tabId: TabConfig['id'], isGenerating: boolean) => {
    if (isGenerating) {
      if (tabId === 'mindmap') return 'Đang vẽ sơ đồ AI...';
      if (tabId === 'quiz') return 'Đang tạo câu hỏi AI...';
      return 'Đang tóm tắt lại AI...';
    }
    if (tabId === 'mindmap') return 'Tạo lại Mindmap AI';
    if (tabId === 'quiz') return 'Tạo lại 10 câu hỏi AI';
    return 'Tóm tắt lại bằng AI';
  };

  const isCurrentTabGenerating = getIsGenerating(activeTabId);
  const activeTabConfig = TABS.find((t) => t.id === activeTabId) || TABS[0];

  return (
    <div className="w-full h-full flex flex-col bg-card min-h-0 overflow-hidden">
      {/* Top Header: Ergonomic Segmented Pill Track (Left) + Contextual AI Action (Right) */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-border/80 bg-card/60 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3">
        {/* Segmented Pill Track */}
        <nav
          role="tablist"
          aria-label="Chế độ học tập tương tác bài học"
          className="inline-flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTabId(tab.id)}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium'
                }`}
              >
                <Icon
                  icon={tab.icon}
                  className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
                    isActive ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'
                  }`}
                />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Instructor Action: Dedicated AI Trigger for the active tab */}
        {isInstructor && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCurrentTabGenerating}
              onClick={() => handleTriggerAiForActiveTab(activeTabId)}
              title={`Tạo lại dữ liệu AI cho tab ${activeTabConfig.title}`}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:scale-98 text-white transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <Icon
                icon={isCurrentTabGenerating ? 'lucide:loader-2' : 'lucide:sparkles'}
                className={`size-3.5 shrink-0 ${isCurrentTabGenerating ? 'animate-spin' : ''}`}
              />
              <span>{getAiButtonText(activeTabId, isCurrentTabGenerating)}</span>
            </button>
          </div>
        )}
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
