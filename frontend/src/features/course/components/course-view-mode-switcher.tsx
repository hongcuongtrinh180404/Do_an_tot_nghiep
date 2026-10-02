'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type CourseViewMode = 'tree' | 'mindmap';

export interface CourseViewModeSwitcherProps {
  viewMode: CourseViewMode;
  onChangeViewMode: (mode: CourseViewMode) => void;
  className?: string;
}

interface SwitcherTabOption {
  id: CourseViewMode;
  label: string;
  icon: string;
}

const VIEW_OPTIONS: readonly SwitcherTabOption[] = [
  {
    id: 'tree',
    label: 'Dạng Cây',
    icon: 'lucide:folder-tree',
  },
  {
    id: 'mindmap',
    label: 'Sơ Đồ Tư Duy',
    icon: 'lucide:network',
  },
] as const;

export function CourseViewModeSwitcher({
  viewMode,
  onChangeViewMode,
  className,
}: CourseViewModeSwitcherProps): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Chế độ xem giáo trình"
      className={cn(
        'inline-flex items-center bg-[#f1f5f9] dark:bg-slate-800/80 p-1 sm:p-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/60 shadow-xs select-none',
        className
      )}
    >
      {VIEW_OPTIONS.map((option) => {
        const isActive = viewMode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => onChangeViewMode(option.id)}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-1.5 text-xs sm:text-sm rounded-full cursor-pointer transition-all duration-200 ease-in-out',
              isActive
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/40'
            )}
          >
            <Icon
              icon={option.icon}
              className={cn(
                'size-4 shrink-0 transition-transform duration-200',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 scale-105'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
