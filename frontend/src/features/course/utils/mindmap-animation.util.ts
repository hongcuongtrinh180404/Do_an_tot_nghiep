import type { Node, Edge } from '@xyflow/react';

/**
 * Đường cong gia tốc Ease Out Cubic
 * Cho chuyển động tự nhiên: xuất phát nhanh và giảm tốc êm ái khi về đích.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface TransitionState {
  nodes: Node[];
  edges: Edge[];
}

export interface AnimateLayoutOptions {
  currentNodes: Node[];
  currentEdges: Edge[];
  targetNodes: Node[];
  targetEdges: Edge[];
  /**
   * Thời lượng chuyển động (ms).
   * Mặc định 220ms (Thang điểm 9.5/10: cực kỳ nhanh, nhạy bén và dứt khoát nhưng vẫn mượt mà).
   */
  duration?: number;
  onFrame: (state: TransitionState) => void;
  onComplete?: () => void;
}

/**
 * Điều phối hoạt họa chuyển động khi Thu gọn & Mở rộng nhánh cây (Frame-by-frame Tweening)
 * - Các node mới xuất hiện sẽ lướt ra từ tọa độ node cha và tăng dần độ hiển thị (fade in).
 * - Các node thu gọn sẽ lướt về phía node cha và giảm dần độ hiển thị (fade out).
 * - Các node anh em giữ nguyên sẽ trượt êm ái về vị trí layout mới (không bị giật cục).
 * - Các đường cong Bézier tự động uốn lượn bám sát tọa độ node trong từng khung hình.
 */
export function startLayoutAnimation({
  currentNodes,
  currentEdges,
  targetNodes,
  targetEdges,
  duration = 220,
  onFrame,
  onComplete,
}: AnimateLayoutOptions): () => void {
  const currentPosMap = new Map<string, { x: number; y: number }>();
  currentNodes.forEach((node) => {
    currentPosMap.set(node.id, { x: node.position.x, y: node.position.y });
  });

  const targetPosMap = new Map<string, { x: number; y: number }>();
  targetNodes.forEach((node) => {
    targetPosMap.set(node.id, { x: node.position.x, y: node.position.y });
  });

  // Map quan hệ cha-con trong layout mục tiêu
  const targetParentMap = new Map<string, string>();
  targetEdges.forEach((edge) => {
    targetParentMap.set(edge.target, edge.source);
  });

  // Map quan hệ cha-con trong layout hiện tại
  const currentParentMap = new Map<string, string>();
  currentEdges.forEach((edge) => {
    currentParentMap.set(edge.target, edge.source);
  });

  // 1. Nodes mục tiêu (Nodes đang hiển thị + Nodes mới bung ra)
  const animatingTargetNodes = targetNodes.map((targetNode) => {
    const startPos = currentPosMap.get(targetNode.id);
    if (startPos) {
      return {
        node: targetNode,
        startX: startPos.x,
        startY: startPos.y,
        targetX: targetNode.position.x,
        targetY: targetNode.position.y,
        startOpacity: 1,
        targetOpacity: 1,
      };
    }

    // Node mới mở rộng: Khởi phát từ vị trí node cha
    const parentId = targetParentMap.get(targetNode.id);
    const parentPos = parentId
      ? currentPosMap.get(parentId) || targetPosMap.get(parentId)
      : null;
    const startX = parentPos ? parentPos.x : targetNode.position.x;
    const startY = parentPos ? parentPos.y : targetNode.position.y;

    return {
      node: targetNode,
      startX,
      startY,
      targetX: targetNode.position.x,
      targetY: targetNode.position.y,
      startOpacity: 0,
      targetOpacity: 1,
    };
  });

  // 2. Nodes đang thu gọn (Ẩn dần về node cha)
  const closingNodes = currentNodes
    .filter((n) => !targetPosMap.has(n.id))
    .map((closingNode) => {
      const parentId = currentParentMap.get(closingNode.id);
      const targetPos = parentId
        ? targetPosMap.get(parentId) || currentPosMap.get(parentId)
        : null;
      const targetX = targetPos ? targetPos.x : closingNode.position.x;
      const targetY = targetPos ? targetPos.y : closingNode.position.y;

      return {
        node: closingNode,
        startX: closingNode.position.x,
        startY: closingNode.position.y,
        targetX,
        targetY,
        startOpacity: 1,
        targetOpacity: 0,
      };
    });

  // Edges kết hợp: Edges mục tiêu + Edges của closing nodes
  const targetEdgeIds = new Set(targetEdges.map((e) => e.id));
  const closingEdges = currentEdges.filter(
    (e) => !targetEdgeIds.has(e.id) && !targetPosMap.has(e.target),
  );

  const startTime = performance.now();
  let animationFrameId: number | null = null;

  const tick = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeOutCubic(progress);

    // Tính toán tọa độ và độ trong suốt frame hiện tại
    const frameNodes: Node[] = [
      ...animatingTargetNodes.map((item) => ({
        ...item.node,
        position: {
          x: item.startX + (item.targetX - item.startX) * ease,
          y: item.startY + (item.targetY - item.startY) * ease,
        },
        style: {
          ...item.node.style,
          opacity: item.startOpacity + (item.targetOpacity - item.startOpacity) * ease,
        },
      })),
      ...closingNodes.map((item) => ({
        ...item.node,
        position: {
          x: item.startX + (item.targetX - item.startX) * ease,
          y: item.startY + (item.targetY - item.startY) * ease,
        },
        style: {
          ...item.node.style,
          opacity: item.startOpacity + (item.targetOpacity - item.startOpacity) * ease,
        },
      })),
    ];

    const frameEdges: Edge[] = [
      ...targetEdges.map((edge) => {
        const isNewEdge = !currentEdges.some((ce) => ce.id === edge.id);
        if (isNewEdge) {
          return {
            ...edge,
            style: {
              ...edge.style,
              opacity: ease,
            },
          };
        }
        return edge;
      }),
      ...closingEdges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1 - ease,
        },
      })),
    ];

    onFrame({ nodes: frameNodes, edges: frameEdges });

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(tick);
    } else {
      // Kết thúc animation: Đảm bảo dữ liệu chuẩn targetNodes và targetEdges
      onFrame({
        nodes: targetNodes,
        edges: targetEdges,
      });
      onComplete?.();
    }
  };

  animationFrameId = requestAnimationFrame(tick);

  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}
