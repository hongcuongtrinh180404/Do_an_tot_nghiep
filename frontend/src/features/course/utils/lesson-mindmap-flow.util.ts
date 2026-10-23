import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';
import type { ILessonMindmapNode } from 'share-lib';
import { findOverlappingBoxes, type LayoutBox } from './mindmap-collision.util';

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

/**
 * Kích thước cố định của node lesson mindmap.
 * Phải khớp 100% với style width/height trong lesson-mindmap-canvas-node.tsx.
 *
 * Chiều cao 88px chừa đủ cho title 2 dòng (85.5px) + viền/padding.
 */
export const LESSON_NODE_DIMENSIONS: Record<number, { width: number; height: number }> = {
  0: { width: 340, height: 88 }, // Root
  1: { width: 300, height: 88 }, // Cấp 1
  2: { width: 300, height: 88 }, // Cấp 2
  3: { width: 300, height: 88 }, // Cấp 3
};

const DEFAULT_LESSON_NODE_DIMENSION = { width: 300, height: 88 };

export function getNodeDimension(level: number): { width: number; height: number } {
  return LESSON_NODE_DIMENSIONS[level] ?? DEFAULT_LESSON_NODE_DIMENSION;
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
 * kèm bố cục Dagre tự động căn chỉnh tọa độ ngang (LR).
 *
 * Khoảng hở được đảm bảo đồng nhất vì mọi node trong cùng một rank dùng chung
 * kích thước cố định, và kích thước Dagre lấy từ đúng constants dùng để render.
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
    rankSep = 100,
    nodeSep = 40,
  } = options;

  const rawNodes: Node<LessonMindmapNodeData>[] = [];
  const rawEdges: Edge[] = [];

  function traverse(node: ILessonMindmapNode, level: number, parentId?: string) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    const childCount = hasChildren ? countDescendantNodes(node) : 0;
    const isNearCurrentTime = Math.abs(currentTime - node.timestamp) < 5;
    const dim = getNodeDimension(level);
    // Luôn duyệt children theo timestamp tăng dần. Sort ổn định để các node
    // cùng mốc thời gian giữ nguyên thứ tự ban đầu.
    const chronologicalChildren = hasChildren
      ? [...node.children!].sort((a, b) => {
          const timeA = Number.isFinite(a.timestamp) ? a.timestamp : 0;
          const timeB = Number.isFinite(b.timestamp) ? b.timestamp : 0;
          return timeA - timeB;
        })
      : [];

    const flowNode: Node<LessonMindmapNodeData> = {
      id: node.id,
      type: 'lessonMindmap',
      position: { x: 0, y: 0 },
      width: dim.width,
      height: dim.height,
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

    // Nếu nhánh chưa bị thu gọn, tiếp tục đệ quy các con theo thứ tự thời gian
    if (hasChildren && !isCollapsed) {
      for (const child of chronologicalChildren) {
        traverse(child, level + 1, node.id);
      }
    }
  }

  traverse(root, 0);

  const isHorizontal = direction === 'LR';

  function buildLayout(currentRankSep: number, currentNodeSep: number) {
    // Áp dụng thuật toán Dagre Layout
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: direction,
      ranksep: currentRankSep,
      nodesep: currentNodeSep,
    });
    g.setDefaultEdgeLabel(() => ({}));

    rawNodes.forEach((node) => {
      const dim = getNodeDimension(node.data.level);
      g.setNode(node.id, { width: dim.width, height: dim.height });
    });

    rawEdges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // rawNodes đã được duyệt theo timestamp tăng dần. Tắt heuristic tối ưu
    // thứ tự của Dagre để nó giữ nguyên thứ tự chèn từ trên xuống, đồng thời
    // vẫn tự căn node cha giữa cụm con (tránh con bị đẩy quá xa khi bung nhánh).
    dagre.layout(g, { disableOptimalOrderHeuristic: true });

    return rawNodes.map((node) => {
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
  }

  let currentRankSep = rankSep;
  let currentNodeSep = nodeSep;
  let layoutedNodes = buildLayout(currentRankSep, currentNodeSep);

  // Lưới an toàn chống overlap: kiểm tra cả phần badge timestamp (trên 14px)
  // và nút mở rộng (phải 13px). Nếu vẫn chồng, tăng gap và layout lại.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const boxes: LayoutBox[] = layoutedNodes.map((node) => {
      const dim = getNodeDimension(node.data.level);
      return {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: dim.width,
        height: dim.height,
        margin: { top: 14, right: 13, left: 6 },
      };
    });

    if (findOverlappingBoxes(boxes).length === 0) break;

    currentRankSep += 12;
    currentNodeSep += 8;
    layoutedNodes = buildLayout(currentRankSep, currentNodeSep);
  }

  return { nodes: layoutedNodes, edges: rawEdges };
}
