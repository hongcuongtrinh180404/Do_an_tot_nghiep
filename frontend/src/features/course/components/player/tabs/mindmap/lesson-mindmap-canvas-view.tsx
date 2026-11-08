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
import { Icon } from '@/components/ui/icon';
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
  canEdit?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  collapsedIds?: Set<string>;
  onCollapsedIdsChange?: (newSet: Set<string>) => void;
}

function LessonMindmapFlowCanvas({
  root,
  canEdit = false,
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

  // Highlight node gần thời điểm video hiện tại mà KHÔNG reset vị trí
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

  // Toàn màn hình toggle: Cơ chế CSS overlay fixed inset-0 z-50 từ CourseMindmapView
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Hỗ trợ phím tắt Escape để thoát toàn màn hình
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Căn giữa lại toàn màn hình khi chuyển đổi kích thước
  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView({ padding: 0.25, duration: 300 });
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen, fitView]);

  // Khôi phục layout chuẩn sau khi người dùng kéo node
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

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 w-screen h-screen bg-background flex flex-col p-3 sm:p-5 transition-all duration-200'
    : 'relative w-full rounded-2xl border border-border/80 bg-muted/15 overflow-hidden transition-all h-[520px] sm:h-[580px] flex flex-col';

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Top Header Bar khi mở Toàn màn hình */}
      {isFullscreen && (
        <div className="shrink-0 flex items-center justify-between pb-3 px-1 border-b border-border/70 mb-2 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-semibold shrink-0">
              <Icon icon="lucide:network" className="size-3.5" />
              <span>Sơ đồ tư duy bài học</span>
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
              {root.title}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            title="Thoát toàn màn hình (Phím Esc)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer border border-border/70 shrink-0"
          >
            <Icon icon="lucide:minimize-2" className="size-3.5" />
            <span>Thoát (Esc)</span>
          </button>
        </div>
      )}

      {/* Viewport container */}
      <div className="flex-1 w-full h-full relative min-h-0">
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
          nodesDraggable={canEdit}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
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
