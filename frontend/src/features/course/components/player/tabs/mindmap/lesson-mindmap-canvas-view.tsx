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
import { LessonMindmapCanvasNode } from './lesson-mindmap-canvas-node';
import { LessonMindmapCanvasToolbar } from './lesson-mindmap-canvas-toolbar';
import {
  convertLessonMindmapToFlowElements,
  collectBranchNodeIds,
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

function LessonMindmapFlowCanvas(props: LessonMindmapCanvasViewProps): React.JSX.Element {
  const { root, currentTime = 0, onSeek } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo mặc định thu gọn hiển thị 2 cấp độ đầu tiên (Level 0 Root + Level 1 con trực tiếp)
  const [internalCollapsedIds, setInternalCollapsedIds] = useState<Set<string>>(() =>
    generateLessonMindmapDefaultCollapsedIds(root, 1),
  );

  const activeCollapsedIds = props.collapsedIds ?? internalCollapsedIds;

  const updateCollapsed = useCallback(
    (newSet: Set<string>) => {
      if (props.onCollapsedIdsChange) {
        props.onCollapsedIdsChange(newSet);
      } else {
        setInternalCollapsedIds(newSet);
      }
    },
    [props.onCollapsedIdsChange],
  );

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { fitView } = useReactFlow();

  // Kiểm tra xem có đang mở rộng toàn bộ không
  const isFullyExpanded = activeCollapsedIds.size === 0;

  // Toggle thu gọn từng node (Hỗ trợ mở rộng tiệm tiến - Progressive Disclosure)
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

  // Toggle thu gọn / mở rộng tất cả (Chuyển đổi giữa Toàn bộ cây và Thu gọn về 2 cấp độ)
  const handleToggleCollapseAll = useCallback(() => {
    if (isFullyExpanded) {
      updateCollapsed(generateLessonMindmapDefaultCollapsedIds(root, 1));
    } else {
      updateCollapsed(new Set());
    }
  }, [isFullyExpanded, root, updateCollapsed]);

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
        fitView({ padding: 0.2, duration: 250 });
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [fitView]);

  // Tính toán layout ReactFlow từ cây dữ liệu
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return convertLessonMindmapToFlowElements(root, {
      collapsedIds: activeCollapsedIds,
      currentTime,
      onToggleCollapse: handleToggleCollapse,
      onSeek,
    });
  }, [root, activeCollapsedIds, currentTime, handleToggleCollapse, onSeek]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Cập nhật nodes và edges khi initialNodes hoặc initialEdges thay đổi
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Tự động fit view khi vừa mount hoặc khi cấu trúc thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 80);
    return () => clearTimeout(timer);
  }, [fitView, activeCollapsedIds]);

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
