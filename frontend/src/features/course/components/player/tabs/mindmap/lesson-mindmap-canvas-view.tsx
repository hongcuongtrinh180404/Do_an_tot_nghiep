'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ILessonMindmapNode } from 'share-lib';
import { SmoothBezierEdge } from '@/features/course/components/mindmap/edges/smooth-bezier-edge';
import { startLayoutAnimation } from '@/features/course/utils/mindmap-animation.util';
import { LessonMindmapCanvasNode } from './lesson-mindmap-canvas-node';
import { LessonMindmapCanvasToolbar } from './lesson-mindmap-canvas-toolbar';
import {
  convertLessonMindmapToFlowElements,
  generateLessonMindmapDefaultCollapsedIds,
  type LessonMindmapNodeData,
} from '../../../../utils/lesson-mindmap-flow.util';

const nodeTypes: NodeTypes = {
  lessonMindmap: LessonMindmapCanvasNode,
};

const edgeTypes: EdgeTypes = {
  smoothBezier: SmoothBezierEdge,
};

export interface LessonMindmapCanvasViewProps {
  root: ILessonMindmapNode;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  collapsedIds?: Set<string>;
  onCollapsedIdsChange?: (newSet: Set<string>) => void;
}

function LessonMindmapFlowCanvas({
  root,
  currentTime = 0,
  onSeek,
  collapsedIds,
  onCollapsedIdsChange,
}: LessonMindmapCanvasViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo mặc định thu gọn hiển thị 2 cấp độ đầu tiên (Level 0 Root + Level 1 con trực tiếp)
  const [internalCollapsedIds, setInternalCollapsedIds] = useState<Set<string>>(() =>
    generateLessonMindmapDefaultCollapsedIds(root, 1),
  );

  const activeCollapsedIds = collapsedIds ?? internalCollapsedIds;

  const updateCollapsed = useCallback(
    (newSet: Set<string>) => {
      if (onCollapsedIdsChange) {
        onCollapsedIdsChange(newSet);
      } else {
        setInternalCollapsedIds(newSet);
      }
    },
    [onCollapsedIdsChange],
  );

  const handleToggleCollapse = useCallback(
    (id: string) => {
      const next = new Set(activeCollapsedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      updateCollapsed(next);
    },
    [activeCollapsedIds, updateCollapsed],
  );

  const handleToggleCollapseAll = useCallback(() => {
    const isAllCollapsed = activeCollapsedIds.size > 0;
    const next = isAllCollapsed
      ? new Set<string>()
      : generateLessonMindmapDefaultCollapsedIds(root, 1);

    updateCollapsed(next);
  }, [activeCollapsedIds, root, updateCollapsed]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { fitView } = useReactFlow();

  // Kiểm tra xem có đang mở rộng toàn bộ không
  const isFullyExpanded = activeCollapsedIds.size === 0;

  // Layout chỉ phụ thuộc cấu trúc cây + trạng thái thu gọn.
  // KHÔNG phụ thuộc currentTime để tránh chạy Dagre liên tục khi video đang phát.
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    return convertLessonMindmapToFlowElements(root, {
      collapsedIds: activeCollapsedIds,
      currentTime: 0,
      onToggleCollapse: handleToggleCollapse,
      onSeek,
    });
  }, [root, activeCollapsedIds, handleToggleCollapse, onSeek]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const cancelAnimationRef = useRef<(() => void) | null>(null);
  const isFirstLayoutRef = useRef(true);
  // Tăng revision sau mỗi animation để effect highlight áp lại trạng thái mới nhất
  // (animation frames dùng target nodes từ layout nên có thể ghi đè highlight).
  const [highlightRevision, setHighlightRevision] = useState(0);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Animate khi cấu trúc / trạng thái thu gọn thay đổi
  useEffect(() => {
    cancelAnimationRef.current?.();

    if (isFirstLayoutRef.current) {
      isFirstLayoutRef.current = false;
      setNodes(layoutNodes);
      setEdges(layoutEdges);
      return;
    }

    cancelAnimationRef.current = startLayoutAnimation({
      currentNodes: nodesRef.current,
      currentEdges: edgesRef.current,
      targetNodes: layoutNodes,
      targetEdges: layoutEdges,
      duration: 220,
      onFrame: ({ nodes: frameNodes, edges: frameEdges }) => {
        setNodes(frameNodes);
        setEdges(frameEdges);
      },
      onComplete: () => {
        cancelAnimationRef.current = null;
        setHighlightRevision((value) => value + 1);
        void fitView({ padding: 0.25, duration: 300 });
      },
    });

    return () => {
      cancelAnimationRef.current?.();
    };
  }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView]);

  // Dọn dẹp animation khi unmount
  useEffect(() => {
    return () => {
      cancelAnimationRef.current?.();
    };
  }, []);

  // Highlight node gần thời điểm video hiện tại mà KHÔNG reset vị trí (kể cả khi user đang kéo node)
  useEffect(() => {
    const nearNodeIds = new Set<string>();
    for (const node of layoutNodes) {
      if (Math.abs(currentTime - node.data.timestamp) < 5) {
        nearNodeIds.add(node.id);
      }
    }

    setNodes((previousNodes) => {
      let changed = false;
      const nextNodes = previousNodes.map((node) => {
        const isNear = nearNodeIds.has(node.id);
        if (Boolean(node.data.isNearCurrentTime) === isNear) return node;
        changed = true;
        return {
          ...node,
          data: { ...node.data, isNearCurrentTime: isNear },
        };
      });
      return changed ? nextNodes : previousNodes;
    });

    setEdges((previousEdges) => {
      let changed = false;
      const nextEdges = previousEdges.map((edge) => {
        const isNear = nearNodeIds.has(edge.target);
        if (Boolean(edge.animated) === isNear) return edge;
        changed = true;
        return { ...edge, animated: isNear };
      });
      return changed ? nextEdges : previousEdges;
    });
  }, [currentTime, layoutNodes, highlightRevision, setNodes, setEdges]);

  // Tự động fit view lần đầu khi ReactFlow đã render/measure nodes
  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView({ padding: 0.25, duration: 400 });
    }, 120);

    return () => clearTimeout(timer);
  }, [fitView]);

  // Toàn màn hình toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      // Tự động căn giữa sau khi chuyển trạng thái fullscreen
      setTimeout(() => {
        void fitView({ padding: 0.2, duration: 250 });
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [fitView]);

  // Khôi phục layout chuẩn sau khi người dùng kéo node (drag được giữ nguyên như hiện tại)
  const handleRelayout = useCallback(() => {
    cancelAnimationRef.current?.();

    const target = convertLessonMindmapToFlowElements(root, {
      collapsedIds: activeCollapsedIds,
      currentTime,
      onToggleCollapse: handleToggleCollapse,
      onSeek,
    });

    cancelAnimationRef.current = startLayoutAnimation({
      currentNodes: nodesRef.current,
      currentEdges: edgesRef.current,
      targetNodes: target.nodes,
      targetEdges: target.edges,
      duration: 220,
      onFrame: ({ nodes: frameNodes, edges: frameEdges }) => {
        setNodes(frameNodes);
        setEdges(frameEdges);
      },
      onComplete: () => {
        cancelAnimationRef.current = null;
        setHighlightRevision((value) => value + 1);
        void fitView({ padding: 0.25, duration: 300 });
      },
    });
  }, [root, currentTime, activeCollapsedIds, handleToggleCollapse, onSeek, setNodes, setEdges, fitView]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-border/80 bg-muted/15 overflow-hidden transition-all ${
        isFullscreen ? 'h-screen w-screen p-4' : 'h-[520px] sm:h-[580px]'
      }`}
    >
      {/* Floating Toolbar */}
      <div className="absolute top-3 right-3 z-10">
        <LessonMindmapCanvasToolbar
          isAllCollapsed={!isFullyExpanded}
          onToggleCollapseAll={handleToggleCollapseAll}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onRelayout={handleRelayout}
        />
      </div>

      {/* Mini Helper Badge */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-xs border border-border/70 text-[11px] text-muted-foreground shadow-2xs">
        <span className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
        <span>Cuộn chuột để thu phóng • Kéo để di chuyển • Bấm mốc thời gian để tua video</span>
      </div>

      {/* ReactFlow Canvas */}
      <ReactFlow<Node<LessonMindmapNodeData>, Edge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 50, y: 150, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
        className="touch-none select-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="var(--border)"
          className="opacity-50"
        />
      </ReactFlow>
    </div>
  );
}

export function LessonMindmapCanvasView(props: LessonMindmapCanvasViewProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <LessonMindmapFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
