import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

export const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  courseRoot: { width: 300, height: 96 },
  section: { width: 260, height: 76 },
  lesson: { width: 240, height: 68 },
  keypoint: { width: 210, height: 48 },
};

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Thuật toán căn chỉnh cây tự động (Tree Layout Algorithm)
 * Sử dụng Dagre (biến thể Sugiyama/Reingold-Tilford) để tự động tính toán
 * Bounding Box và phân bổ tọa độ X, Y đều nhau từ trái sang phải mà không bị đè chữ.
 */
export function getLayoutedElements<T extends Node, E extends Edge>(
  nodes: T[],
  edges: E[],
  options: LayoutOptions = {},
): { nodes: T[]; edges: E[] } {
  const { direction = 'LR', rankSep = 80, nodeSep = 24 } = options;
  const isHorizontal = direction === 'LR';

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const dim = NODE_DIMENSIONS[node.type ?? ''] ?? { width: 220, height: 64 };
    g.setNode(node.id, { width: dim.width, height: dim.height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const dim = NODE_DIMENSIONS[node.type ?? ''] ?? { width: 220, height: 64 };

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - dim.width / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - dim.height / 2 : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
