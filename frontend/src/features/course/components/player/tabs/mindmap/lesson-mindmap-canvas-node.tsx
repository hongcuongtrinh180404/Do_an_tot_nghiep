'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import {
  getNodeDimension,
  type LessonMindmapNodeData,
} from '../../../../utils/lesson-mindmap-flow.util';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function LessonMindmapCanvasNodeComponent({ data }: NodeProps): React.JSX.Element {
  const nodeData = data as unknown as LessonMindmapNodeData;
  const isRoot = nodeData.level === 0;
  const dimension = getNodeDimension(nodeData.level);

  return (
    <div
      className={cn(
        'group relative box-border flex items-center rounded-[18px] bg-white border-2 border-[#1E2243] px-5 py-[18px] pr-6 transition-all duration-200 select-none shadow-[0_4px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_8px_20px_rgba(30,34,67,0.12)] hover:-translate-y-0.5',
        nodeData.isNearCurrentTime && 'ring-2 ring-sky-500 ring-offset-2',
      )}
      style={{ width: dimension.width, height: dimension.height }}
    >
      {/* Target Handle (Nhận đường nối từ Node Cha bên trái) */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-2.5 !bg-[#1E2243] !border-2 !border-white !-left-1.5"
        />
      )}

      {/* Huy hiệu Timestamp gắn nổi ở góc trên mép phải */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          nodeData.onSeek?.(nodeData.timestamp);
        }}
        title={`Tua video tới mốc ${formatTime(nodeData.timestamp)}`}
        className="absolute -top-[14px] right-[18px] inline-flex items-center gap-1.5 bg-white border-[1.5px] border-[#818CF8] text-[#1E2243] px-3 py-[3px] rounded-full text-[13px] font-semibold font-mono cursor-pointer select-none transition-colors duration-150 hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-[#4F46E5] shadow-2xs"
      >
        <span className="text-[11px] leading-none select-none">▷</span>
        <span>{formatTime(nodeData.timestamp)}</span>
      </button>

      {/* Tiêu đề nội dung: luôn clamp 2 dòng + ellipsis, hover để xem đầy đủ */}
      <p
        className="m-0 w-full min-w-0 text-[15px] font-bold text-[#0F172A] leading-[1.45] tracking-[-0.01em] line-clamp-2 break-words [overflow-wrap:anywhere]"
        title={nodeData.title}
      >
        {nodeData.title}
      </p>

      {/* Source Handle (Phát đường nối sang Node Con bên phải) */}
      {nodeData.hasChildren && !nodeData.isCollapsed && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2.5 !bg-[#1E2243] !border-2 !border-white !-right-1.5"
        />
      )}

      {/* Nút mở rộng/thu gọn nhánh con neo ở giữa mép phải */}
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
          className="absolute -right-[13px] top-1/2 -translate-y-1/2 size-[26px] rounded-full bg-[#2563EB] text-white border-[2.5px] border-white text-[11px] font-extrabold flex items-center justify-center cursor-pointer shadow-[0_2px_6px_rgba(37,99,235,0.35)] transition-transform duration-150 hover:bg-[#1D4ED8] hover:scale-110 active:scale-95 z-20"
        >
          {nodeData.isCollapsed ? (
            <span>+{nodeData.childCount}</span>
          ) : (
            <Icon icon="lucide:minus" className="size-3 stroke-[3]" />
          )}
        </button>
      )}
    </div>
  );
}

export const LessonMindmapCanvasNode = memo(LessonMindmapCanvasNodeComponent);
