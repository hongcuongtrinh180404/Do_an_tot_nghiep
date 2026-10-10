'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';

export interface TabConfig {
  id: 'summary' | 'mindmap' | 'quiz' | 'chatbot';
  tabNumber: string;
  title: string;
  icon: string;
  heading: string;
  description: string;
  badgeText: string;
}

const TABS: TabConfig[] = [
  {
    id: 'summary',
    tabNumber: '1',
    title: 'Summary',
    icon: 'lucide:file-text',
    heading: 'Summary (Tóm tắt bài học)',
    description: 'Khu vực hiển thị tóm tắt nội dung bài giảng, các điểm ghi nhớ cốt lõi (Key Points) và tài liệu học tập.',
    badgeText: 'Chưa có nội dung tóm tắt',
  },
  {
    id: 'mindmap',
    tabNumber: '2',
    title: 'Mindmap',
    icon: 'lucide:network',
    heading: 'Mindmap (Sơ đồ tư duy)',
    description: 'Khu vực trực quan hóa kiến thức bài học dưới dạng sơ đồ tư duy phân nhánh trực quan sinh động.',
    badgeText: 'Chưa có dữ liệu sơ đồ tư duy',
  },
  {
    id: 'quiz',
    tabNumber: '3',
    title: 'Quizz',
    icon: 'lucide:help-circle',
    heading: 'Quizz (Câu hỏi trắc nghiệm)',
    description: 'Khu vực hiển thị danh sách và tương tác với các câu hỏi kiểm tra kiến thức xuất hiện trong video.',
    badgeText: 'Chưa có câu hỏi trắc nghiệm',
  },
  {
    id: 'chatbot',
    tabNumber: '4',
    title: 'Chatbot',
    icon: 'lucide:bot',
    heading: 'Chatbot (Trợ lý AI)',
    description: 'Khu vực trò chuyện cùng trợ lý AI thông minh để giải đáp thắc mắc và làm rõ các khái niệm trong bài giảng.',
    badgeText: 'Trợ lý AI sẵn sàng kết nối',
  },
];

export function LessonTabsContainer(): React.JSX.Element {
  const [activeTabId, setActiveTabId] = useState<TabConfig['id']>('summary');

  const currentTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  return (
    <div className="w-full h-full flex flex-col bg-card min-h-0 overflow-hidden">
      {/* Horizontal Full-width 4-Segment Tab Bar */}
      <div className="shrink-0 border-b border-border bg-muted/20 grid grid-cols-4">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2.5 py-3.5 px-2 sm:px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-background shadow-2xs font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <span
                className={`size-6 rounded-md flex items-center justify-center font-mono text-xs font-bold transition-colors shrink-0 ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-2xs'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.tabNumber}
              </span>
              <span className="truncate">{tab.title}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display Area (Clean Placeholder / Empty State) */}
      <div className="flex-1 min-h-[320px] p-6 sm:p-10 flex flex-col justify-center items-center">
        <div className="max-w-xl w-full mx-auto text-center space-y-4 py-6 px-6 rounded-2xl border border-dashed border-border/80 bg-muted/10">
          <div className="size-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-2xs">
            <Icon icon={currentTab.icon} className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold text-foreground">
              {currentTab.heading}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {currentTab.description}
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground bg-background border border-border shadow-2xs">
              <span className="size-2 rounded-full bg-amber-500/80 animate-pulse" />
              {currentTab.badgeText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

