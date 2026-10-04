'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import type { CourseRootNodeData } from '../../../utils/mindmap-converter.util';

function CourseRootNodeComponent({ data }: NodeProps): React.JSX.Element {
  const nodeData = data as unknown as CourseRootNodeData;

  return (
    <div className="relative group min-w-[280px] max-w-[320px] rounded-2xl bg-card border-2 border-primary/70 p-4 shadow-md transition-all hover:shadow-lg">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <Icon icon="lucide:graduation-cap" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Gốc khóa học
            </span>
            {nodeData.level && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                {nodeData.level}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
            {nodeData.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium">
              <Icon icon="lucide:folder" className="size-3 text-sky-500" />
              {nodeData.totalSections} chương
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <Icon icon="lucide:book-open" className="size-3 text-emerald-500" />
              {nodeData.totalLessons} bài học
            </span>
          </div>
        </div>
      </div>

      {/* Connection Handle to Sections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !bg-primary !border-2 !border-background !-right-1.5 transition-transform group-hover:scale-125"
      />
    </div>
  );
}

export const CourseRootNode = memo(CourseRootNodeComponent);
