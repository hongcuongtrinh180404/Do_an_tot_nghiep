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
  /** Thời lượng chuyển động (ms). Mặc định 180ms. */
  duration?: number;
  onFrame: (state: TransitionState) => void;
  onComplete?: () => void;
}

/** Ngưỡng pixel: node lệch < 0.5px được coi là static */
const STATIC_THRESHOLD = 0.5;

/**
 * Animation engine tối ưu FPS tối đa:
 * - Pre-compute Sets/Maps ngoài tick loop (tránh O(n²) per frame)
 * - Pool frameNodes/frameEdges arrays giữa các frame (giảm GC)
 * - Skip static nodes không di chuyển (reuse object reference)
 * - Pre-compute delta (dX, dY) thay vì tính trong mỗi frame
 */
export function startLayoutAnimation({
  currentNodes,
  currentEdges,
  targetNodes,
  targetEdges,
  duration = 180,
  onFrame,
  onComplete,
}: AnimateLayoutOptions): () => void {
  // ── Pre-compute phase (1 lần duy nhất) ──────────────────────────────────

  const currentPosMap = new Map<string, { x: number; y: number }>();
  for (const node of currentNodes) {
    currentPosMap.set(node.id, node.position);
  }

  const targetPosMap = new Map<string, { x: number; y: number }>();
  for (const node of targetNodes) {
    targetPosMap.set(node.id, node.position);
  }

  const targetParentMap = new Map<string, string>();
  for (const edge of targetEdges) {
    targetParentMap.set(edge.target, edge.source);
  }

  const currentParentMap = new Map<string, string>();
  for (const edge of currentEdges) {
    currentParentMap.set(edge.target, edge.source);
  }

  const currentEdgeIdSet = new Set<string>();
  for (const edge of currentEdges) currentEdgeIdSet.add(edge.id);

  const targetEdgeIdSet = new Set<string>();
  for (const edge of targetEdges) targetEdgeIdSet.add(edge.id);

  const newEdgeIds = new Set<string>();
  for (const edge of targetEdges) {
    if (!currentEdgeIdSet.has(edge.id)) newEdgeIds.add(edge.id);
  }

  // ── Phân loại nodes ──────────────────────────────────────────────────────

  interface AnimNode {
    node: Node;
    startX: number;
    startY: number;
    dX: number;
    dY: number;
    startOpacity: number;
    dOpacity: number;
    isStatic: boolean;
  }

  const animatingTargetNodes: AnimNode[] = targetNodes.map((targetNode) => {
    const startPos = currentPosMap.get(targetNode.id);

    if (startPos) {
      const dX = targetNode.position.x - startPos.x;
      const dY = targetNode.position.y - startPos.y;
      return {
        node: targetNode,
        startX: startPos.x,
        startY: startPos.y,
        dX,
        dY,
        startOpacity: 1,
        dOpacity: 0,
        isStatic: Math.abs(dX) < STATIC_THRESHOLD && Math.abs(dY) < STATIC_THRESHOLD,
      };
    }

    const parentId = targetParentMap.get(targetNode.id);
    const parentPos = parentId
      ? (currentPosMap.get(parentId) ?? targetPosMap.get(parentId))
      : null;
    const startX = parentPos ? parentPos.x : targetNode.position.x;
    const startY = parentPos ? parentPos.y : targetNode.position.y;

    return {
      node: targetNode,
      startX,
      startY,
      dX: targetNode.position.x - startX,
      dY: targetNode.position.y - startY,
      startOpacity: 0,
      dOpacity: 1,
      isStatic: false,
    };
  });

  interface ClosingNode {
    node: Node;
    startX: number;
    startY: number;
    dX: number;
    dY: number;
  }

  const closingNodes: ClosingNode[] = [];
  for (const closingNode of currentNodes) {
    if (targetPosMap.has(closingNode.id)) continue;
    const parentId = currentParentMap.get(closingNode.id);
    const targetPos = parentId
      ? (targetPosMap.get(parentId) ?? currentPosMap.get(parentId))
      : null;
    const targetX = targetPos ? targetPos.x : closingNode.position.x;
    const targetY = targetPos ? targetPos.y : closingNode.position.y;
    closingNodes.push({
      node: closingNode,
      startX: closingNode.position.x,
      startY: closingNode.position.y,
      dX: targetX - closingNode.position.x,
      dY: targetY - closingNode.position.y,
    });
  }

  const closingEdges: Edge[] = [];
  for (const edge of currentEdges) {
    if (targetEdgeIdSet.has(edge.id)) continue;
    if (!targetPosMap.has(edge.target)) closingEdges.push(edge);
  }

  // Pool arrays: tái sử dụng giữa các frame để giảm GC pressure
  const pooledFrameNodes: Node[] = new Array<Node>(
    animatingTargetNodes.length + closingNodes.length,
  );
  const pooledFrameEdges: Edge[] = new Array<Edge>(targetEdges.length + closingEdges.length);

  // ── Tick loop ─────────────────────────────────────────────────────────────

  const startTime = performance.now();
  let animationFrameId: number | null = null;

  const tick = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeOutCubic(progress);

    let ni = 0;

    for (const item of animatingTargetNodes) {
      if (item.isStatic && item.dOpacity === 0) {
        // Static: reuse reference, không allocate object mới
        pooledFrameNodes[ni++] = item.node;
      } else {
        pooledFrameNodes[ni++] = {
          ...item.node,
          position: {
            x: item.startX + item.dX * ease,
            y: item.startY + item.dY * ease,
          },
          style: {
            ...item.node.style,
            opacity: item.startOpacity + item.dOpacity * ease,
          },
        };
      }
    }

    for (const item of closingNodes) {
      pooledFrameNodes[ni++] = {
        ...item.node,
        position: {
          x: item.startX + item.dX * ease,
          y: item.startY + item.dY * ease,
        },
        style: { ...item.node.style, opacity: 1 - ease },
      };
    }

    let ei = 0;

    for (const edge of targetEdges) {
      if (newEdgeIds.has(edge.id)) {
        pooledFrameEdges[ei++] = { ...edge, style: { ...edge.style, opacity: ease } };
      } else {
        // Stable: reuse reference
        pooledFrameEdges[ei++] = edge;
      }
    }

    for (const edge of closingEdges) {
      pooledFrameEdges[ei++] = { ...edge, style: { ...edge.style, opacity: 1 - ease } };
    }

    pooledFrameNodes.length = ni;
    pooledFrameEdges.length = ei;

    onFrame({ nodes: pooledFrameNodes, edges: pooledFrameEdges });

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(tick);
    } else {
      onFrame({ nodes: targetNodes, edges: targetEdges });
      onComplete?.();
    }
  };

  animationFrameId = requestAnimationFrame(tick);

  return () => {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  };
}
