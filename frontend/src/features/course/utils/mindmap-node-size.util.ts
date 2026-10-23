export type CourseMindmapNodeType = 'courseRoot' | 'section' | 'lesson' | 'keypoint';

export interface NodeSize {
  width: number;
  height: number;
}

/**
 * Tăng version này mỗi khi thay đổi kích thước node hoặc công thức layout.
 * Snapshot course_mindmaps cũ hơn version sẽ được tự động re-layout khi mở.
 */
export const COURSE_MINDMAP_LAYOUT_VERSION = 4;

/**
 * Kích thước cố định của từng loại node.
 * Đây là nguồn duy nhất (single source of truth) cho cả:
 * - style width/height của node component
 * - kích thước truyền vào Dagre
 */
export const COURSE_NODE_DIMENSIONS: Record<CourseMindmapNodeType, NodeSize> = {
  courseRoot: { width: 320, height: 128 },
  section: { width: 260, height: 84 },
  lesson: { width: 240, height: 76 },
  keypoint: { width: 210, height: 52 },
};

export const COURSE_MINDMAP_GAPS = {
  rank: 100,
  node: 40,
} as const;

export function getCourseNodeDimension(type: string | undefined): NodeSize {
  return (
    COURSE_NODE_DIMENSIONS[(type ?? '') as CourseMindmapNodeType] ??
    COURSE_NODE_DIMENSIONS.lesson
  );
}
