'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getKeyPointColor } from '../../../utils/lesson-key-points.util';
import type { KeypointNodeData } from '../../../utils/mindmap-converter.util';

function KeypointNodeComponent({ data }: NodeProps): React.JSX.Element {
  const nodeData = data as unknown as KeypointNodeData;
  const theme = getKeyPointColor(nodeData.index);

  return (
    <div
      className="relative group min-w-[190px] max-w-[230px] rounded-lg border p-2 shadow-2xs transition-all hover:shadow-xs"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: theme.border,
      }}
    >
      {/* Target Handle from Lesson */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1.5 !border-2 !border-background !-left-1"
        style={{ backgroundColor: theme.dot }}
      />

      <div className="flex items-start gap-2">
        <span
          className="size-2 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: theme.dot }}
        />
        <p className="text-[10px] text-foreground leading-snug line-clamp-2">
          {nodeData.text}
        </p>
      </div>
    </div>
  );
}

export const KeypointNode = memo(KeypointNodeComponent);
