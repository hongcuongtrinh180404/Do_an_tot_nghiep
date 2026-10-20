'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { LessonMindmapNodeData } from '../../../../utils/lesson-mindmap-flow.util';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function LessonMindmapCanvasNodeComponent({ data }: NodeProps): React.JSX.Element {
  const nodeData = data as unknown as LessonMindmapNodeData;
  const isRoot = nodeData.level === 0;

  // Level color tokens (Tuân thủ Purple Ban: Sky Blue, Indigo, Slate)
  const levelStyles = [
    // Level 0 (Root): Nổi bật nhất với sắc Sky Blue
    'bg-sky-500/10 border-2 border-sky-500/50 text-sky-950 dark:text-sky-100 shadow-sm',
    // Level 1: Nhánh chính cấp 1 với sắc Indigo nhẹ
    'bg-indigo-500/10 border border-indigo-500/40 text-indigo-950 dark:text-indigo-200 shadow-2xs',
    // Level 2: Nhánh cấp 2 với Card theme chuẩn
    'bg-card border border-border/90 text-foreground shadow-2xs',
    // Level 3+: Nhánh chi tiết
    'bg-muted/40 border border-border/70 text-muted-foreground',
  ];

  const currentLevelStyle = levelStyles[Math.min(nodeData.level, levelStyles.length - 1)];

  return (
    <div
      className={cn(
        'group relative min-w-[200px] max-w-[280px] rounded-xl px-3 py-2.5 transition-all select-none',
        currentLevelStyle,
        nodeData.isNearCurrentTime
          ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-background'
          : 'hover:border-sky-500/60 hover:shadow-xs',
      )}
    >
      {/* Target Handle (Nhận đường nối từ Node Cha bên trái) */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-2 !bg-sky-600 !border-2 !border-background !-left-1"
        />
      )}

      {/* Nội dung Node */}
      <div className="flex flex-col space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
            {isRoot ? 'Chủ đề gốc' : `Cấp ${nodeData.level + 1}`}
          </span>

          {/* Badge mốc thời gian video - Nhấp để tua video */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onSeek?.(nodeData.timestamp);
            }}
            title={`Tua video tới ${formatTime(nodeData.timestamp)}`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-background/90 hover:bg-sky-600 hover:text-white border border-border/80 text-muted-foreground transition-colors cursor-pointer shadow-2xs"
          >
            <Icon icon="lucide:play" className="size-2.5" />
            <span>{formatTime(nodeData.timestamp)}</span>
          </button>
        </div>

        {/* Tiêu đề Node */}
        <p
          className={cn(
            'leading-snug line-clamp-2',
            isRoot ? 'text-xs sm:text-sm font-bold' : 'text-xs font-medium',
          )}
        >
          {nodeData.title}
        </p>
      </div>

      {/* Source Handle (Phát đường nối sang Node Con bên phải) */}
      {nodeData.hasChildren && !nodeData.isCollapsed && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2 !bg-sky-600 !border-2 !border-background !-right-1"
        />
      )}

      {/* Nút Thu gọn / Mở rộng nhánh con */}
      {nodeData.hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onToggleCollapse?.(nodeData.id);
          }}
          title={
            nodeData.isCollapsed
              ? `Mở rộng ${nodeData.childCount} nhánh con`
              : 'Thu gọn nhánh con'
          }
          className={cn(
            'absolute top-1/2 -right-3 -translate-y-1/2 z-20',
            'h-5 min-w-[20px] px-1 rounded-full',
            'border-2 border-background shadow-xs hover:shadow-sm',
            'flex items-center justify-center cursor-pointer select-none',
            'transition-all duration-200 active:scale-95 hover:scale-110',
            nodeData.isCollapsed
              ? 'bg-sky-600 hover:bg-sky-500 text-white'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
          )}
        >
          {nodeData.isCollapsed ? (
            <span className="font-bold text-[10px] leading-none">
              +{nodeData.childCount}
            </span>
          ) : (
            <Icon icon="lucide:minus" className="size-2.5 stroke-[2.5]" />
          )}
        </button>
      )}
    </div>
  );
}

export const LessonMindmapCanvasNode = memo(LessonMindmapCanvasNodeComponent);
