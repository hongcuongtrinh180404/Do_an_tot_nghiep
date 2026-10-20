import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';
import type { ILessonMindmapNode } from 'share-lib';

export interface LessonMindmapNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  timestamp: number;
  level: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  childCount: number;
  isNearCurrentTime: boolean;
  onToggleCollapse?: (id: string) => void;
  onSeek?: (timestamp: number) => void;
}

const LESSON_NODE_DIMENSIONS: Record<number, { width: number; height: number }> = {
  0: { width: 280, height: 76 }, // Root node
  1: { width: 250, height: 68 }, // Level 1
  2: { width: 230, height: 60 }, // Level 2
};

function getNodeDimension(level: number): { width: number; height: number } {
  return LESSON_NODE_DIMENSIONS[level] ?? { width: 220, height: 56 };
}

/**
 * Đếm tổng số lượng node con cháu (descendants) bên dưới một node
 */
export function countDescendantNodes(node: ILessonMindmapNode): number {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce((total, child) => {
    return total + 1 + countDescendantNodes(child);
  }, 0);
}

/**
 * Thu thập danh sách ID của tất cả các node có con trong cây
 */
export function collectBranchNodeIds(node: ILessonMindmapNode): string[] {
  const ids: string[] = [];
  if (Array.isArray(node.children) && node.children.length > 0) {
    ids.push(node.id);
    for (const child of node.children) {
      ids.push(...collectBranchNodeIds(child));
    }
  }
  return ids;
}

/**
 * Tạo danh sách thu gọn mặc định để chỉ hiển thị tối đa `maxVisibleLevel` cấp độ đầu tiên
 * (Mặc định: maxVisibleLevel = 1 -> Hiển thị Node Root cấp 0 và các nhánh chính cấp 1).
 * Tất cả các nhánh từ level >= maxVisibleLevel có con sẽ được đưa vào danh sách thu gọn,
 * bao gồm cả các nhánh sâu hơn (pre-collapse) để hỗ trợ mở rộng tiệm tiến (Progressive Disclosure).
 */
export function generateLessonMindmapDefaultCollapsedIds(
  root: ILessonMindmapNode,
  maxVisibleLevel = 1,
): Set<string> {
  const collapsed = new Set<string>();

  function traverse(node: ILessonMindmapNode, level: number) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    if (hasChildren) {
      if (level >= maxVisibleLevel) {
        collapsed.add(node.id);
      }
      for (const child of node.children!) {
        traverse(child, level + 1);
      }
    }
  }

  traverse(root, 0);
  return collapsed;
}

export interface ConvertFlowOptions {
  collapsedIds?: Set<string>;
  currentTime?: number;
  onToggleCollapse?: (id: string) => void;
  onSeek?: (timestamp: number) => void;
  direction?: 'LR' | 'TB';
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Chuyển đổi cấu trúc cây ILessonMindmapNode thành danh sách Nodes và Edges của ReactFlow
 * kèm bố cục Dagre tự động căn chỉnh tọa độ ngang (LR)
 */
export function convertLessonMindmapToFlowElements(
  root: ILessonMindmapNode,
  options: ConvertFlowOptions = {},
): { nodes: Node<LessonMindmapNodeData>[]; edges: Edge[] } {
  const {
    collapsedIds = new Set<string>(),
    currentTime = 0,
    onToggleCollapse,
    onSeek,
    direction = 'LR',
    rankSep = 75,
    nodeSep = 24,
  } = options;

  const rawNodes: Node<LessonMindmapNodeData>[] = [];
  const rawEdges: Edge[] = [];

  function traverse(node: ILessonMindmapNode, level: number, parentId?: string) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    const childCount = hasChildren ? countDescendantNodes(node) : 0;
    const isNearCurrentTime = Math.abs(currentTime - node.timestamp) < 5;

    const flowNode: Node<LessonMindmapNodeData> = {
      id: node.id,
      type: 'lessonMindmap',
      position: { x: 0, y: 0 },
      data: {
        id: node.id,
        title: node.title,
        timestamp: node.timestamp,
        level,
        hasChildren,
        isCollapsed,
        childCount,
        isNearCurrentTime,
        onToggleCollapse,
        onSeek,
      },
    };
    rawNodes.push(flowNode);

    if (parentId) {
      const edge: Edge = {
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothBezier',
        animated: isNearCurrentTime,
      };
      rawEdges.push(edge);
    }

    // Nếu nhánh chưa bị thu gọn, tiếp tục đệ quy các con
    if (hasChildren && !isCollapsed && node.children) {
      for (const child of node.children) {
        traverse(child, level + 1, node.id);
      }
    }
  }

  traverse(root, 0);

  // Áp dụng thuật toán Dagre Layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
  });
  g.setDefaultEdgeLabel(() => ({}));

  rawNodes.forEach((node) => {
    const dim = getNodeDimension(node.data.level);
    g.setNode(node.id, { width: dim.width, height: dim.height });
  });

  rawEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const isHorizontal = direction === 'LR';
  const layoutedNodes = rawNodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const dim = getNodeDimension(node.data.level);

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

  return { nodes: layoutedNodes, edges: rawEdges };
}
