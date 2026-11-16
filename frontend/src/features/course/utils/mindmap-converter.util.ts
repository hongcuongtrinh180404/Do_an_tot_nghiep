import type { Node, Edge } from '@xyflow/react';
import type { ISection, ILesson } from 'share-lib';

export interface CourseMindmapRawData {
  course: {
    id: string;
    title: string;
    level?: string;
  };
  sections: ISection[];
  lessonsBySection: Record<string, ILesson[]>;
}

export interface CourseRootNodeData {
  title: string;
  level?: string;
  totalSections: number;
  totalLessons: number;
  [key: string]: unknown;
}

export interface SectionNodeData {
  sectionId: string;
  index: number;
  title: string;
  lessonCount: number;
  isCollapsed: boolean;
  onToggleCollapse?: (sectionId: string) => void;
  [key: string]: unknown;
}

export interface LessonNodeData {
  lessonId: string;
  sectionId: string;
  index: number;
  title: string;
  duration?: number;
  isPreview?: boolean;
  contentType?: string;
  [key: string]: unknown;
}

/**
 * Chuyển đổi Khóa học, Chương mục và Bài học thành Nodes & Edges của React Flow.
 */
export function convertCurriculumToFlowElements(
  data: CourseMindmapRawData,
  collapsedIds: Set<string>,
  callbacks?: {
    onToggleSectionCollapse?: (sectionId: string) => void;
  },
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const { course, sections, lessonsBySection } = data;
  // Thứ tự hiển thị trên canvas phải theo tiến trình giáo trình tăng dần.
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);

  let totalLessons = 0;
  Object.values(lessonsBySection).forEach((list) => {
    totalLessons += list.length;
  });

  // 1. Root Node: Khóa học (Level 0)
  const rootId = 'root-course';
  nodes.push({
    id: rootId,
    type: 'courseRoot',
    position: { x: 0, y: 0 },
    data: {
      title: course.title || 'Khóa học',
      level: course.level,
      totalSections: sections.length,
      totalLessons,
    } satisfies CourseRootNodeData,
  });

  // 2. Sections (Level 1)
  orderedSections.forEach((section, sIdx) => {
    const secNodeId = `sec-${section.id}`;
    const lessons = [...(lessonsBySection[section.id] ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const isSecCollapsed = collapsedIds.has(section.id);

    nodes.push({
      id: secNodeId,
      type: 'section',
      position: { x: 0, y: 0 },
      data: {
        sectionId: section.id,
        index: sIdx,
        title: section.title,
        lessonCount: lessons.length,
        isCollapsed: isSecCollapsed,
        onToggleCollapse: callbacks?.onToggleSectionCollapse,
      } satisfies SectionNodeData,
    });

    edges.push({
      id: `edge-${rootId}-${secNodeId}`,
      source: rootId,
      target: secNodeId,
      type: 'smoothBezier',
    });

    // Nếu Section bị đóng (collapsed), không render các lesson bên dưới
    if (isSecCollapsed) return;

    // 3. Lessons (Level 2)
    lessons.forEach((lesson, lIdx) => {
      const lesNodeId = `les-${lesson.id}`;

      nodes.push({
        id: lesNodeId,
        type: 'lesson',
        position: { x: 0, y: 0 },
        data: {
          lessonId: lesson.id,
          sectionId: section.id,
          index: lIdx,
          title: lesson.title,
          duration: lesson.content?.duration,
          isPreview: lesson.isPreview,
          contentType: lesson.content?.type,
        } satisfies LessonNodeData,
      });

      edges.push({
        id: `edge-${secNodeId}-${lesNodeId}`,
        source: secNodeId,
        target: lesNodeId,
        type: 'smoothBezier',
      });

    });
  });

  return { nodes, edges };
}

/**
 * Tạo danh sách thu gọn mặc định: Thu gọn toàn bộ Chương mục (ẩn bài học)
 * để khởi tạo canvas ở mức 2 cấp độ đầu tiên.
 */
export function generateDefaultCollapsedIds(rawData: CourseMindmapRawData): Set<string> {
  const collapsed = new Set<string>();

  // 1. Thu gọn tất cả các Section
  rawData.sections.forEach((sec) => {
    collapsed.add(sec.id);
  });

  return collapsed;
}

