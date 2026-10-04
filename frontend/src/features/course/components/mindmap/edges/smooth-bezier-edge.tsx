'use client';

import React, { memo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

function SmoothBezierEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps): React.JSX.Element {
  // Tính toán đường cong Cubic Bézier mượt mà với 2 điểm điều khiển P1, P2
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        strokeWidth: 2,
        stroke: 'var(--border)',
        ...style,
      }}
      className="transition-colors hover:stroke-primary/70"
    />
  );
}

export const SmoothBezierEdge = memo(SmoothBezierEdgeComponent);
