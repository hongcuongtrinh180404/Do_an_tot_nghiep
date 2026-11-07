'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ILesson, LessonContentTypeEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';
import type { IPublicCourseDetailResponse } from '../../api/enrollment.api';
import { useCourseMindmapQuery } from '../../hooks/use-course-mindmap';
import {
  convertCurriculumToFlowElements,
  generateDefaultCollapsedIds,
  type CourseMindmapRawData,
  type LessonNodeData,
} from '../../utils/mindmap-converter.util';
import { getLayoutedElements } from '../../utils/mindmap-layout.util';
import { COURSE_MINDMAP_LAYOUT_VERSION } from '../../utils/mindmap-node-size.util';
import { startLayoutAnimation } from '../../utils/mindmap-animation.util';

import { CourseRootNode } from '../mindmap/nodes/course-root-node';
import { SectionNode } from '../mindmap/nodes/section-node';
import { LessonNode } from '../mindmap/nodes/lesson-node';
import { KeypointNode } from '../mindmap/nodes/keypoint-node';
import { SmoothBezierEdge } from '../mindmap/edges/smooth-bezier-edge';
import {
  CourseMindmapContextProvider,
  type CourseMindmapContextValue,
} from '../mindmap/course-mindmap-context';

const nodeTypes: NodeTypes = {
  courseRoot: CourseRootNode,
  section: SectionNode,
  lesson: LessonNode,
  keypoint: KeypointNode,
};

const edgeTypes: EdgeTypes = {
  smoothBezier: SmoothBezierEdge,
};

interface CourseMindmapTabProps {
  course: IPublicCourseDetailResponse;
  isEnrolled: boolean;
  isInstructorOwner: boolean;
  totalLessonsCount: number;
}

interface InnerMindmapCanvasProps {
  course: IPublicCourseDetailResponse;
  rawData: CourseMindmapRawData;
  isEnrolled: boolean;
  isInstructorOwner: boolean;
  totalLessonsCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function InnerMindmapCanvas({
  course,
  rawData,
  isEnrolled,
  isInstructorOwner,
  totalLessonsCount,
  isFullscreen,
  onToggleFullscreen,
}: InnerMindmapCanvasProps): React.JSX.Element {
  const router = useRouter();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { data: savedMindmapData } = useCourseMindmapQuery(course.id);

  // Compute initial layout: Either use saved snapshot (if valid version) or calculate on-the-fly from rawData
  const initialData = useMemo(() => {
    const saved = savedMindmapData as unknown as {
      nodes?: Node[];
      edges?: Edge[];
      collapsedIds?: string[];
      layoutVersion?: number;
    } | null;

    if (
      saved &&
      saved.layoutVersion === COURSE_MINDMAP_LAYOUT_VERSION &&
      Array.isArray(saved.nodes) &&
      saved.nodes.length > 0 &&
      Array.isArray(saved.edges)
    ) {
      return {
        nodes: saved.nodes,
        edges: saved.edges,
        collapsedIds: new Set(saved.collapsedIds ?? []),
      };
    }

    // Auto layout from curriculum data
    const defaultCollapsed = generateDefaultCollapsedIds(rawData);
    const { nodes: rawNodes, edges: rawEdges } = convertCurriculumToFlowElements(
      rawData,
      defaultCollapsed,
    );
    const layouted = getLayoutedElements(rawNodes, rawEdges, { direction: 'LR' });

    return {
      nodes: layouted.nodes,
      edges: layouted.edges,
      collapsedIds: defaultCollapsed,
    };
  }, [savedMindmapData, rawData]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialData.edges);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => initialData.collapsedIds);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const cancelAnimationRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      cancelAnimationRef.current?.();
    };
  }, []);

  const animateToLayout = useCallback(
    (targetNodes: Node[], targetEdges: Edge[]) => {
      cancelAnimationRef.current?.();
      cancelAnimationRef.current = startLayoutAnimation({
        currentNodes: nodesRef.current,
        currentEdges: edgesRef.current,
        targetNodes,
        targetEdges,
        duration: 220,
        onFrame: ({ nodes: frameNodes, edges: frameEdges }) => {
          setNodes(frameNodes);
          setEdges(frameEdges);
        },
        onComplete: () => {
          cancelAnimationRef.current = null;
        },
      });
    },
    [setNodes, setEdges],
  );

  const layoutCacheRef = useRef<Map<string, { nodes: Node[]; edges: Edge[] }>>(new Map());

  const getLayoutedCached = useCallback(
    (nextCollapsedIds: Set<string>): { nodes: Node[]; edges: Edge[] } => {
      const cacheKey = Array.from(nextCollapsedIds).sort().join(',');
      const cached = layoutCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const { nodes: rawNodes, edges: rawEdges } = convertCurriculumToFlowElements(
        rawData,
        nextCollapsedIds,
      );
      const result = getLayoutedElements(rawNodes, rawEdges, { direction: 'LR' });
      if (layoutCacheRef.current.size >= 20) {
        const firstKey = layoutCacheRef.current.keys().next().value;
        if (firstKey) layoutCacheRef.current.delete(firstKey);
      }
      layoutCacheRef.current.set(cacheKey, result);
      return result;
    },
    [rawData],
  );

  const contextValue = useMemo<CourseMindmapContextValue>(
    () => ({
      onToggleSectionCollapse: (sectionId: string) => {
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          if (next.has(sectionId)) {
            next.delete(sectionId);
          } else {
            next.add(sectionId);
          }
          const layouted = getLayoutedCached(next);
          animateToLayout(layouted.nodes, layouted.edges);
          return next;
        });
      },
      onToggleLessonCollapse: (lessonId: string) => {
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          if (next.has(lessonId)) {
            next.delete(lessonId);
          } else {
            next.add(lessonId);
          }
          const layouted = getLayoutedCached(next);
          animateToLayout(layouted.nodes, layouted.edges);
          return next;
        });
      },
    }),
    [getLayoutedCached, animateToLayout],
  );

  // Auto fit view on mount or layout switch
  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView({ duration: 300, padding: 0.2 });
    }, 80);
    return () => clearTimeout(timer);
  }, [fitView]);

  const handleFitView = (): void => {
    void fitView({ duration: 250, padding: 0.2 });
  };

  const handleExpandAll = (): void => {
    const emptySet = new Set<string>();
    setCollapsedIds(emptySet);
    const layouted = getLayoutedCached(emptySet);
    animateToLayout(layouted.nodes, layouted.edges);
    requestAnimationFrame(() => {
      void fitView({ duration: 250, padding: 0.2 });
    });
  };

  const handleCollapseAll = (): void => {
    const defaultCollapsed = generateDefaultCollapsedIds(rawData);
    setCollapsedIds(defaultCollapsed);
    const layouted = getLayoutedCached(defaultCollapsed);
    animateToLayout(layouted.nodes, layouted.edges);
    requestAnimationFrame(() => {
      void fitView({ duration: 250, padding: 0.2 });
    });
  };

  // Node click: If lesson node, check access and navigate directly
  const handleNodeClick = (_: React.MouseEvent, node: Node): void => {
    if (node.type === 'lesson') {
      const lessonData = node.data as unknown as LessonNodeData;
      if (lessonData?.lessonId) {
        const canAccess = isEnrolled || isInstructorOwner || lessonData.isPreview;
        if (canAccess) {
          router.push(`/courses/${course.id}/lessons/${lessonData.lessonId}`);
        } else {
          toast.info('Bài giảng bị khóa. Vui lòng đăng ký khóa học để xem toàn bộ nội dung.', {
            duration: 3500,
          });
        }
      }
    }
  };

  return (
    <CourseMindmapContextProvider value={contextValue}>
      <div className="relative size-full flex flex-col bg-white select-none">
        {/* Student Viewer Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-[#e5e7eb] bg-neutral-50/90 backdrop-blur-md z-10">
          {/* Left info badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f3fcfc] border border-[#027D88]/20 text-[#027D88] text-xs font-bold">
              <Icon icon="lucide:network" className="size-3.5" />
              <span>Sơ đồ tư duy trực quan</span>
            </span>
            <span className="text-xs text-[#666666] hidden sm:inline">
              • {rawData.sections.length} chương • {totalLessonsCount} bài giảng
            </span>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Expand / Collapse All */}
            <div className="hidden sm:flex items-center gap-1 bg-white border border-[#e5e7eb] rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2 py-1 text-xs font-semibold text-[#666666] hover:text-[#027D88] hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                title="Mở rộng tất cả các nhánh"
              >
                Mở tất cả
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2 py-1 text-xs font-semibold text-[#666666] hover:text-[#161616] hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                title="Thu gọn về cấp độ chương"
              >
                Thu gọn
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-white border border-[#e5e7eb] rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => void zoomIn({ duration: 200 })}
                aria-label="Phóng to sơ đồ"
                className="size-7 rounded hover:bg-neutral-100 text-[#666666] hover:text-[#161616] flex items-center justify-center cursor-pointer transition-colors"
                title="Phóng to"
              >
                <Icon icon="lucide:plus" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void zoomOut({ duration: 200 })}
                aria-label="Thu nhỏ sơ đồ"
                className="size-7 rounded hover:bg-neutral-100 text-[#666666] hover:text-[#161616] flex items-center justify-center cursor-pointer transition-colors"
                title="Thu nhỏ"
              >
                <Icon icon="lucide:minus" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFitView}
                aria-label="Căn giữa sơ đồ vừa khung nhìn"
                className="size-7 rounded hover:bg-neutral-100 text-[#666666] hover:text-[#027D88] flex items-center justify-center cursor-pointer transition-colors"
                title="Căn giữa màn hình"
              >
                <Icon icon="lucide:maximize-2" className="size-3.5" />
              </button>
            </div>

            {/* Toggle Minimap */}
            <button
              type="button"
              onClick={() => setShowMinimap((prev) => !prev)}
              aria-label={showMinimap ? 'Tắt bản đồ thu nhỏ' : 'Bật bản đồ thu nhỏ'}
              className={`size-8 rounded-lg border transition-colors flex items-center justify-center cursor-pointer shadow-2xs ${
                showMinimap
                  ? 'border-[#027D88] bg-[#f3fcfc] text-[#027D88]'
                  : 'border-[#e5e7eb] bg-white text-[#666666] hover:text-[#161616]'
              }`}
              title="Bản đồ thu nhỏ"
            >
              <Icon icon="lucide:map" className="size-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-neutral-50 text-[#161616] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ' : 'Xem toàn màn hình'}
            >
              <Icon icon={isFullscreen ? 'lucide:minimize' : 'lucide:expand'} className="size-3.5" />
              <span className="hidden sm:inline">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </button>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div className="flex-1 w-full h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onlyRenderVisibleElements={true}
            elevateNodesOnSelect={false}
            elevateEdgesOnSelect={false}
            fitView
            fitViewOptions={{ padding: 0.2, duration: 300 }}
            minZoom={0.15}
            maxZoom={2.2}
            defaultEdgeOptions={{ type: 'smoothBezier' }}
            proOptions={{ hideAttribution: true }}
            className="bg-neutral-50/40"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.2}
              className="opacity-40"
            />
            {showMinimap && (
              <MiniMap
                className="!bg-white/95 !border !border-[#e5e7eb] !rounded-2xl !shadow-md overflow-hidden !m-4"
                nodeStrokeColor="#027D88"
                nodeColor="#e5e7eb"
                zoomable
                pannable
              />
            )}
          </ReactFlow>
        </div>
      </div>
    </CourseMindmapContextProvider>
  );
}

export function CourseMindmapTab({
  course,
  isEnrolled,
  isInstructorOwner,
  totalLessonsCount,
}: CourseMindmapTabProps): React.JSX.Element {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Transform public course sections into CourseMindmapRawData format
  const rawData: CourseMindmapRawData = useMemo(() => {
    const lessonsBySection: Record<string, ILesson[]> = {};
    course.sections?.forEach((sec) => {
      lessonsBySection[sec.id] = (sec.lessons || []).map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        sectionId: sec.id,
        courseId: course.id,
        content: {
          type: (l.type as LessonContentTypeEnum) || null,
          duration: l.duration,
        },
        isPreview: l.isPreview,
      } as unknown as ILesson));
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        level: course.level,
      },
      sections: course.sections || [],
      lessonsBySection,
    };
  }, [course]);

  // Escape key listener to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (!course.sections || course.sections.length === 0) {
    return (
      <div
        role="tabpanel"
        id="tabpanel-mindmap"
        aria-labelledby="tab-mindmap"
        className="w-full h-[480px] rounded-2xl border border-dashed border-[#e5e7eb] bg-white flex flex-col items-center justify-center gap-3 text-center p-8"
      >
        <div className="size-14 rounded-2xl bg-[#f3fcfc] text-[#027D88] flex items-center justify-center border border-[#027D88]/20">
          <Icon icon="lucide:network" className="size-7" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h4 className="text-base font-bold text-[#161616]">Chưa có dữ liệu sơ đồ tư duy</h4>
          <p className="text-xs text-[#666666] leading-relaxed">
            Khóa học hiện chưa có chương mục bài giảng nào để tổng hợp thành sơ đồ tư duy.
          </p>
        </div>
      </div>
    );
  }

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 w-screen h-screen bg-white'
    : 'w-full h-[560px] sm:h-[620px] rounded-2xl border border-[#e5e7eb] shadow-2xs overflow-hidden bg-white';

  return (
    <div
      role="tabpanel"
      id="tabpanel-mindmap"
      aria-labelledby="tab-mindmap"
      className="space-y-4 pt-2"
    >
      <div className={containerClasses}>
        <ReactFlowProvider>
          <InnerMindmapCanvas
            course={course}
            rawData={rawData}
            isEnrolled={isEnrolled}
            isInstructorOwner={isInstructorOwner}
            totalLessonsCount={totalLessonsCount}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          />
        </ReactFlowProvider>
      </div>

      <p className="text-xs text-[#666666] italic flex items-center gap-1.5 pt-1">
        <Icon icon="lucide:info" className="size-3.5 text-[#027D88] shrink-0" />
        <span>
          Mẹo: Bạn có thể kéo thả để di chuyển, cuộn chuột để phóng to/thu nhỏ hoặc nhấn vào các nút tròn để thu gọn/mở rộng từng nhánh bài học.
        </span>
      </p>
    </div>
  );
}

