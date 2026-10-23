import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';
import {
  COURSE_MINDMAP_GAPS,
  COURSE_NODE_DIMENSIONS,
  getCourseNodeDimension,
} from './mindmap-node-size.util';
import {
  findOverlappingBoxes,
  type LayoutBox,
  type LayoutMargin,
} from './mindmap-collision.util';

export { COURSE_NODE_DIMENSIONS as NODE_DIMENSIONS };

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  rankSep?: number;
  nodeSep?: number;
}

function getCourseNodeMargin(type: string | undefined): LayoutMargin {
  if (type === 'section' || type === 'lesson') {
    return { left: 6, right: 12 };
  }
  if (type === 'keypoint') {
    return { left: 4 };
  }
  return { right: 6 };
}

/**
 * Thuật toán căn chỉnh cây tự động (Tree Layout Algorithm)
 * Sử dụng Dagre (biến thể Sugiyama/Reingold-Tilford) để tự động tính toán
 * Bounding Box và phân bổ tọa độ X, Y đều nhau từ trái sang phải mà không bị đè chữ.
 *
 * Kích thước node lấy từ COURSE_NODE_DIMENSIONS - cũng là kích thước render thực tế.
 * Vì mỗi rank chỉ chứa một loại node, khoảng hở giữa các rank luôn đúng bằng rankSep
 * và khoảng hở giữa các node cùng rank luôn đúng bằng nodeSep.
 */
export function getLayoutedElements<T extends Node, E extends Edge>(
  nodes: T[],
  edges: E[],
  options: LayoutOptions = {},
): { nodes: T[]; edges: E[] } {
  const {
    direction = 'LR',
    rankSep = COURSE_MINDMAP_GAPS.rank,
    nodeSep = COURSE_MINDMAP_GAPS.node,
  } = options;
  const isHorizontal = direction === 'LR';

  function buildLayout(currentRankSep: number, currentNodeSep: number): T[] {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: direction,
      ranksep: currentRankSep,
      nodesep: currentNodeSep,
    });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      const dim = getCourseNodeDimension(node.type);
      g.setNode(node.id, { width: dim.width, height: dim.height });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // nodes được converter tạo theo DFS: section/lesson/keypoint đang theo
    // đúng thứ tự giáo trình tăng dần. Tắt heuristic tối ưu thứ tự của Dagre
    // để giữ nguyên thứ tự chèn từ trên xuống và vẫn căn cha giữa cụm con.
    dagre.layout(g, { disableOptimalOrderHeuristic: true });

    return nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      const dim = getCourseNodeDimension(node.type);

      return {
        ...node,
        width: dim.width,
        height: dim.height,
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

  // Lưới an toàn chống overlap: kiểm tra cả badge thu gọn/handle nhô ra ngoài.
  // Với kích thước cố định bước này thường pass ngay lần đầu; nếu CSS thay đổi
  // làm node to hơn constants, layout sẽ tự tăng gap và chạy lại.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const boxes: LayoutBox[] = layoutedNodes.map((node) => {
      const dim = getCourseNodeDimension(node.type);
      return {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: dim.width,
        height: dim.height,
        margin: getCourseNodeMargin(node.type),
      };
    });

    if (findOverlappingBoxes(boxes).length === 0) break;

    currentRankSep += 12;
    currentNodeSep += 8;
    layoutedNodes = buildLayout(currentRankSep, currentNodeSep);
  }

  return { nodes: layoutedNodes, edges };
}
