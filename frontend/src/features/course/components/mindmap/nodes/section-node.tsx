'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import type { SectionNodeData } from '../../../utils/mindmap-converter.util';

import { useCourseMindmapContext } from '../course-mindmap-context';

function SectionNodeComponent({ data }: NodeProps): React.JSX.Element {
  const nodeData = data as unknown as SectionNodeData;
  const { onToggleSectionCollapse } = useCourseMindmapContext();
  const chapterNumber = String(nodeData.index + 1).padStart(2, '0');
  const hasLessons = nodeData.lessonCount > 0;

  return (
    <div className="relative group min-w-[240px] max-w-[280px] rounded-xl bg-card border border-border/80 p-3 shadow-xs transition-all hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md">
      {/* Target Handle from Course Root */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !bg-sky-500 !border-2 !border-background !-left-1.5 transition-transform group-hover:scale-125"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="size-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 font-bold text-xs border border-sky-500/20">
            {chapterNumber}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
              {nodeData.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Icon icon="lucide:video" className="size-2.5 text-muted-foreground" />
                {nodeData.lessonCount} bài học
              </span>
            </div>
          </div>
        </div>

        {/* Expand / Collapse Button */}
        {hasLessons && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSectionCollapse(nodeData.sectionId);
            }}
            title={nodeData.isCollapsed ? 'Mở rộng bài học' : 'Thu gọn bài học'}
            className="size-5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-colors"
          >
            <Icon
              icon={nodeData.isCollapsed ? 'lucide:plus' : 'lucide:minus'}
              className="size-3"
            />
          </button>
        )}
      </div>

      {/* Source Handle to Lessons */}
      {hasLessons && !nodeData.isCollapsed && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2.5 !bg-sky-500 !border-2 !border-background !-right-1.5 transition-transform group-hover:scale-125"
        />
      )}
    </div>
  );
}

export const SectionNode = memo(SectionNodeComponent);
