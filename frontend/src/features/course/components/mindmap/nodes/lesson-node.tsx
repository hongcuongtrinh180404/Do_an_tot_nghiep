'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import type { LessonNodeData } from '../../../utils/mindmap-converter.util';

import { useCourseMindmapContext } from '../course-mindmap-context';
import { CollapseCountBadge } from './collapse-count-badge';

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.round(seconds / 60);
  return `${mins}p`;
}

function LessonNodeComponent({ data }: NodeProps): React.JSX.Element {
  const nodeData = data as unknown as LessonNodeData;
  const { onToggleLessonCollapse } = useCourseMindmapContext();
  const durationText = formatDuration(nodeData.duration);
  const hasKeypoints = nodeData.keyPointCount > 0;
  const isVideo = nodeData.contentType === 'video' || !nodeData.contentType;

  return (
    <div className="relative group min-w-[220px] max-w-[260px] rounded-xl bg-card border border-border/70 p-2.5 shadow-2xs transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm">
      {/* Target Handle from Section */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !bg-emerald-500 !border-2 !border-background !-left-1.5 transition-transform group-hover:scale-125"
      />

      <div className="flex items-start gap-2 min-w-0 pr-2">
        <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <Icon
            icon={isVideo ? 'lucide:play' : 'lucide:file-text'}
            className="size-3"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">
            {nodeData.title}
          </h5>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {durationText && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                <Icon icon="lucide:clock" className="size-2.5" />
                {durationText}
              </span>
            )}
            {nodeData.isPreview && (
              <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Học thử
              </span>
            )}
            {hasKeypoints && (
              <span className="text-[9px] text-muted-foreground">
                {nodeData.keyPointCount} ý chính
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Huy hiệu thu gọn +count / nút mở rộng neo mép phải */}
      <CollapseCountBadge
        count={nodeData.keyPointCount}
        isCollapsed={nodeData.isCollapsed}
        onToggle={() => onToggleLessonCollapse(nodeData.lessonId)}
        variant="emerald"
        typeLabel="ý chính"
      />
    </div>
  );
}

export const LessonNode = memo(LessonNodeComponent);
