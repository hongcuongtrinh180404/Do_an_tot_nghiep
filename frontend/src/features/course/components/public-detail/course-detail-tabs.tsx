'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';

export type CourseDetailTabId = 'info' | 'curriculum' | 'reviews' | 'instructor';

interface CourseDetailTabsProps {
  activeTab: CourseDetailTabId;
  onSelectTab: (tab: CourseDetailTabId) => void;
  reviewCount?: number;
}

interface ITabItem {
  id: CourseDetailTabId;
  label: string;
  icon: string;
}

export function CourseDetailTabs({
  activeTab,
  onSelectTab,
  reviewCount = 583,
}: CourseDetailTabsProps): React.JSX.Element {
  const tabs: ITabItem[] = [
    { id: 'info', label: 'Thông tin', icon: 'lucide:info' },
    { id: 'curriculum', label: 'Nội dung', icon: 'lucide:book-open' },
    { id: 'reviews', label: `Đánh giá (${reviewCount})`, icon: 'lucide:star' },
    { id: 'instructor', label: 'Giảng viên', icon: 'lucide:user' },
  ];

  return (
    <div className="border-b border-[#e5e7eb] w-full overflow-x-auto [scrollbar-width:none]">
      <div
        role="tablist"
        aria-label="Các tab chi tiết khóa học"
        className="flex items-center gap-2 sm:gap-6 min-w-max"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`relative py-3.5 px-2 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#027D88] ${
                isActive
                  ? 'text-[#027D88]'
                  : 'text-[#666666] hover:text-[#161616]'
              }`}
            >
              <Icon
                icon={tab.icon}
                className={`size-4 ${isActive ? 'text-[#027D88]' : 'text-neutral-400'}`}
              />
              <span>{tab.label}</span>

              {/* Active Tab Underline Indicator */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-[#027D88] rounded-t-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

