'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface CollapseCountBadgeProps {
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  variant?: 'sky' | 'emerald';
  typeLabel?: string;
  className?: string;
}

export function CollapseCountBadge({
  count,
  isCollapsed,
  onToggle,
  variant = 'sky',
  typeLabel = 'mục',
  className,
}: CollapseCountBadgeProps): React.JSX.Element | null {
  if (count <= 0) return null;

  const colorStyles =
    variant === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
      : 'bg-sky-600 hover:bg-sky-500 text-white';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={isCollapsed ? `Mở rộng ${count} ${typeLabel}` : `Thu gọn ${typeLabel}`}
        aria-label={isCollapsed ? `Mở rộng ${count} ${typeLabel}` : `Thu gọn ${typeLabel}`}
        className={cn(
          'absolute top-1/2 -right-3 -translate-y-1/2 z-20',
          'h-5.5 min-w-[22px] px-1 rounded-full',
          'border-2 border-background shadow-xs hover:shadow-md',
          'flex items-center justify-center cursor-pointer select-none',
          'transition-all duration-200 ease-out active:scale-95 hover:scale-110',
          colorStyles,
          className,
        )}
      >
        <span className="transition-all duration-200 ease-out flex items-center justify-center">
          {isCollapsed ? (
            <span className="font-bold text-[10.5px] leading-none tracking-tight">
              +{count}
            </span>
          ) : (
            <Icon icon="lucide:minus" className="size-3 stroke-[2.5]" />
          )}
        </span>
      </button>

      {/* Cổng xuất Bézier Handle neo chuẩn xác tại tâm nút bấm */}
      {!isCollapsed && (
        <Handle
          type="source"
          position={Position.Right}
          className="!-right-3 !top-1/2 !-translate-y-1/2 !size-1 !opacity-0 !pointer-events-none"
        />
      )}
    </>
  );
}
