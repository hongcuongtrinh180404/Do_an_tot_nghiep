'use client';

import React, { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { ActionConfirmDialog } from '@/components/shared/dialog/action-confirm-dialog';
import { useLessonQuizzesQuery } from '../../api/lesson-quiz.api';
import type { StudentQuizState } from './tabs/student-lesson-quiz-tab';
import { LessonMindmapTab } from './tabs/lesson-mindmap-tab';
import { LessonQuizTab } from './tabs/lesson-quiz-tab';
import { LessonSummaryTab } from './tabs/lesson-summary-tab';
import {
  useGenerateMindmapMutation,
  useGenerateQuizMutation,
  useGenerateSummaryMutation,
  useLessonMindmapAnalysisQuery,
} from '../../api/transcript-analysis.api';
import { useLessonAnalysisJob } from '../../hooks/use-analysis-jobs';

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
    description: 'Câu hỏi trắc nghiệm củng cố kiến thức xuất hiện theo dòng thời gian video.',
  },
];

export interface LessonTabsContainerProps {
  userId?: string;
  courseId: string;
  reviewQuizId?: string;
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  onPauseVideo?: () => void;
  onTestGemini?: (tabId: TabConfig['id']) => void;
  checkpoints?: StudentQuizState;
}

export function LessonTabsContainer({
  userId,
  courseId,
  reviewQuizId,
  lessonId,
  isInstructor = false,
  currentTime = 0,
  duration,
  onSeek,
  onPauseVideo,
  onTestGemini,
  checkpoints,
}: LessonTabsContainerProps): React.JSX.Element {
  const [activeTabId, setActiveTabId] = useState<TabConfig['id']>(reviewQuizId ? 'quiz' : 'summary');
  const [hasOpenedMindmap, setHasOpenedMindmap] = useState(false);
  const [mindmapLoadingHeight, setMindmapLoadingHeight] = useState(360);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isQuizRegenerateOpen, setIsQuizRegenerateOpen] = useState(false);
  const { data: quizzes = [], isLoading: isQuizzesLoading, isError: isQuizzesError } = useLessonQuizzesQuery(lessonId, isInstructor);
  // Warm the query alongside the other lesson data, without mounting the tree/canvas.
  const { isLoading: isMindmapLoading } = useLessonMindmapAnalysisQuery(lessonId);

  const handleTabChange = (tabId: TabConfig['id']) => {
    if (tabId === 'mindmap') {
      setHasOpenedMindmap(true);
      if (isMindmapLoading) {
        setMindmapLoadingHeight(contentRef.current?.getBoundingClientRect().height ?? 360);
      }
    }
    setActiveTabId(tabId);
  };

  // AI Mutations for quick-trigger from tab bar buttons
  const { mutate: generateMindmap, isPending: isMindmapGenerating } =
    useGenerateMindmapMutation(lessonId);
  const { mutate: generateQuiz, isPending: isQuizGenerating } =
    useGenerateQuizMutation(lessonId);
  const { mutate: generateSummary, isPending: isSummaryGenerating } =
    useGenerateSummaryMutation(lessonId);
  const { isProcessing: isSummaryJobProcessing } = useLessonAnalysisJob(lessonId, 'summary');
  const { isProcessing: isQuizJobProcessing } = useLessonAnalysisJob(lessonId, 'quiz');
  const { isProcessing: isMindmapJobProcessing } = useLessonAnalysisJob(lessonId, 'mindmap');

  const handleTriggerAiForActiveTab = (tabId: TabConfig['id']) => {
    if (!isInstructor) return;

    if (onTestGemini) {
      onTestGemini(tabId);
      return;
    }

    if (tabId === 'mindmap') {
      if (isMindmapJobProcessing) return;
      generateMindmap({ saveAsDraft: false });
    } else if (tabId === 'quiz') {
      if (isQuizJobProcessing) return;
      generateQuiz({ count: 10, saveAsDraft: false });
    } else if (tabId === 'summary') {
      if (isSummaryJobProcessing) return;
      generateSummary({ saveAsDraft: false });
    }
  };

  const requestAiGeneration = (tabId: TabConfig['id']) => {
    if (
      !isInstructor ||
      (tabId === 'quiz' && (isQuizGenerating || isQuizJobProcessing || isQuizzesLoading || isQuizzesError)) ||
      (tabId === 'mindmap' && (isMindmapGenerating || isMindmapJobProcessing)) ||
      (tabId === 'summary' && (isSummaryGenerating || isSummaryJobProcessing))
    ) return;
    if (tabId === 'quiz' && quizzes.length > 0) {
      onPauseVideo?.();
      setIsQuizRegenerateOpen(true);
      return;
    }
    handleTriggerAiForActiveTab(tabId);
  };

  const getIsGenerating = (tabId: TabConfig['id']) => {
    if (tabId === 'mindmap') return isMindmapGenerating || isMindmapJobProcessing;
    if (tabId === 'quiz') return isQuizGenerating || isQuizJobProcessing;
    if (tabId === 'summary') return isSummaryGenerating || isSummaryJobProcessing;
    return false;
  };

  const getAiButtonText = (tabId: TabConfig['id'], isGenerating: boolean) => {
    if (isGenerating) {
      if (tabId === 'mindmap') {
        return isMindmapJobProcessing ? 'AI đang vẽ sơ đồ ngầm...' : 'Đang vẽ sơ đồ AI...';
      }
      if (tabId === 'quiz') {
        return isQuizJobProcessing ? 'AI đang tạo câu hỏi ngầm...' : 'Đang tạo câu hỏi AI...';
      }
      return isSummaryJobProcessing ? 'AI đang xử lý ngầm...' : 'Đang tóm tắt lại AI...';
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
          className="inline-flex max-w-full items-center gap-1 overflow-x-auto p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer ${isActive
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium'
                  }`}
              >
                <Icon
                  icon={tab.icon}
                  className={`size-3.5 sm:size-4 shrink-0 transition-colors ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'
                    }`}
                />
                <span>{tab.title}</span>
                {tab.id === 'summary' && isSummaryJobProcessing && (
                  <span
                    className="size-2 rounded-full bg-sky-500 animate-ping shrink-0"
                    title="AI đang phân tích và tóm tắt bài học trong nền..."
                  />
                )}
                {tab.id === 'quiz' && isQuizJobProcessing && (
                  <span
                    className="size-2 rounded-full bg-sky-500 animate-ping shrink-0"
                    title="AI đang tạo câu hỏi trắc nghiệm trong nền..."
                  />
                )}
                {tab.id === 'mindmap' && isMindmapJobProcessing && (
                  <span
                    className="size-2 rounded-full bg-sky-500 animate-ping shrink-0"
                    title="AI đang vẽ sơ đồ tư duy trong nền..."
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Instructor Action: Dedicated AI Trigger for the active tab */}
        {isInstructor && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCurrentTabGenerating || (activeTabId === 'quiz' && (isQuizzesLoading || isQuizzesError))}
              onClick={() => requestAiGeneration(activeTabId)}
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
      <div
        ref={contentRef}
        className="flex-1 min-h-[360px] overflow-y-auto"
        style={activeTabId === 'mindmap' && isMindmapLoading
          ? { minHeight: Math.max(360, mindmapLoadingHeight) }
          : undefined}
      >
        {activeTabId === 'summary' && (
          <LessonSummaryTab
            lessonId={lessonId}
            isInstructor={isInstructor}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        )}

        {hasOpenedMindmap && (
          <div hidden={activeTabId !== 'mindmap'}>
            <LessonMindmapTab
              key={`${lessonId}:${isInstructor}`}
              lessonId={lessonId}
              isInstructor={isInstructor}
              isActive={activeTabId === 'mindmap'}
              currentTime={activeTabId === 'mindmap' ? currentTime : 0}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
        )}

        {activeTabId === 'quiz' && (
          <LessonQuizTab
            userId={userId}
            courseId={courseId}
            reviewQuizId={reviewQuizId}
            lessonId={lessonId}
            isInstructor={isInstructor}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            onPauseVideo={onPauseVideo}
            onGenerateQuiz={() => requestAiGeneration('quiz')}
            isGenerating={isQuizGenerating}
            checkpoints={checkpoints}
          />
        )}
      </div>
      <ActionConfirmDialog
        open={isInstructor && isQuizRegenerateOpen}
        onOpenChange={setIsQuizRegenerateOpen}
        title="Tạo lại câu hỏi bằng AI?"
        description={`Thao tác này sẽ thay thế toàn bộ ${quizzes.length} câu hỏi hiện tại, bao gồm các câu hỏi đã thêm hoặc chỉnh sửa thủ công.`}
        noticeText="Các câu hỏi hiện tại sẽ được thay thế. Học viên cần hoàn thành bộ câu hỏi mới để hoàn thành bài học."
        variant="warning"
        confirmText="Thay thế bằng 10 câu hỏi AI"
        onConfirm={() => {
          if (!isInstructor || isQuizGenerating) return;
          setIsQuizRegenerateOpen(false);
          handleTriggerAiForActiveTab('quiz');
        }}
        isLoading={isQuizGenerating}
      />
    </div>
  );
}
