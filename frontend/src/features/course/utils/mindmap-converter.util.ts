import type { Node, Edge } from '@xyflow/react';
import type { ISection, ILesson } from 'share-lib';
import { deserializeKeyPoints } from './lesson-key-points.util';

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
  keyPointCount: number;
  isCollapsed: boolean;
  onToggleCollapse?: (lessonId: string) => void;
  [key: string]: unknown;
}

export interface KeypointNodeData {
  keypointId: string;
  text: string;
  index: number;
  [key: string]: unknown;
}

/**
 * Chuyển đổi dữ liệu Khóa học, Chương mục, Bài học và Ý chính thành Nodes & Edges của React Flow
 */
export function convertCurriculumToFlowElements(
  data: CourseMindmapRawData,
  collapsedIds: Set<string>,
  callbacks?: {
    onToggleSectionCollapse?: (sectionId: string) => void;
    onToggleLessonCollapse?: (lessonId: string) => void;
  },
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const { course, sections, lessonsBySection } = data;

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
  sections.forEach((section, sIdx) => {
    const secNodeId = `sec-${section.id}`;
    const lessons = lessonsBySection[section.id] ?? [];
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
      const isLesCollapsed = collapsedIds.has(lesson.id);
      const keyPoints = deserializeKeyPoints(lesson.description);

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
          keyPointCount: keyPoints.length,
          isCollapsed: isLesCollapsed,
          onToggleCollapse: callbacks?.onToggleLessonCollapse,
        } satisfies LessonNodeData,
      });

      edges.push({
        id: `edge-${secNodeId}-${lesNodeId}`,
        source: secNodeId,
        target: lesNodeId,
        type: 'smoothBezier',
      });

      // Nếu Lesson bị đóng (collapsed), không render các keypoint bên dưới
      if (isLesCollapsed) return;

      // 4. Keypoints (Level 3)
      keyPoints.forEach((kp, kpIdx) => {
        const kpNodeId = `kp-${lesson.id}-${kp.id || kpIdx}`;

        nodes.push({
          id: kpNodeId,
          type: 'keypoint',
          position: { x: 0, y: 0 },
          data: {
            keypointId: kp.id,
            text: kp.text,
            index: kpIdx,
          } satisfies KeypointNodeData,
        });

        edges.push({
          id: `edge-${lesNodeId}-${kpNodeId}`,
          source: lesNodeId,
          target: kpNodeId,
          type: 'smoothBezier',
        });
      });
    });
  });

  return { nodes, edges };
}

/**
 * Tạo danh sách thu gọn mặc định: Thu gọn toàn bộ Chương mục (ẩn bài học)
 * và thu gọn toàn bộ Bài học (ẩn ý chính) để khởi tạo canvas ở mức 2 cấp độ đầu tiên.
 */
export function generateDefaultCollapsedIds(rawData: CourseMindmapRawData): Set<string> {
  const collapsed = new Set<string>();

  // 1. Thu gọn tất cả các Section
  rawData.sections.forEach((sec) => {
    collapsed.add(sec.id);
  });

  // 2. Thu gọn trước tất cả các Lesson để khi mở Section thì Lesson không tự động bung Keypoints
  Object.values(rawData.lessonsBySection).forEach((lessons) => {
    lessons.forEach((lesson) => {
      collapsed.add(lesson.id);
    });
  });

  return collapsed;
}

