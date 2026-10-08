'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';

export interface TabConfig {
  id: string;
  tabNumber: string;
  title: string;
  icon?: string;
  description?: string;
}

const TABS: TabConfig[] = [
  {
    id: 'tab-1',
    tabNumber: '1',
    title: 'Tab 1',
    icon: 'lucide:layout',
    description: 'Khu vực hiển thị nội dung cho Tab 1',
  },
  {
    id: 'tab-2',
    tabNumber: '2',
    title: 'Tab 2',
    icon: 'lucide:sparkles',
    description: 'Khu vực hiển thị nội dung cho Tab 2',
  },
  {
    id: 'tab-3',
    tabNumber: '3',
    title: 'Tab 3',
    icon: 'lucide:folder',
    description: 'Khu vực hiển thị nội dung cho Tab 3',
  },
];

export function LessonTabsContainer(): React.JSX.Element {
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const currentTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  return (
    <div className="w-full h-full flex flex-col bg-card min-h-0 overflow-hidden">
      {/* Horizontal Full-width 3-Segment Tab Bar (per user sketch) */}
      <div className="shrink-0 border-b border-border bg-muted/20 grid grid-cols-3">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-background shadow-2xs font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <span
                className={`size-6 rounded-md flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-2xs'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.tabNumber}
              </span>
              <span className="hidden sm:inline">{tab.title}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display Area */}
      <div className="flex-1 min-h-[300px] p-6 sm:p-8 flex flex-col justify-center items-center">
        <div className="max-w-2xl w-full mx-auto text-center space-y-4">
          <div className="size-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-2xs">
            <Icon icon={currentTab.icon || 'lucide:layers'} className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-lg font-bold text-foreground">
              {currentTab.title} ({currentTab.tabNumber})
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {currentTab.description}
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-muted-foreground bg-muted border border-border">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Giao diện sẵn sàng tích hợp logic
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
