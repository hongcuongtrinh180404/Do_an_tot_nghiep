export interface ICourseMindmapNode {
  id?: string;
  title: string;
  type?: 'course' | 'section' | 'lesson' | 'keypoint' | string;
  color?: string;
  children?: ICourseMindmapNode[];
  [key: string]: unknown;
}

export interface ICourseMindmap {
  id: string;
  courseId: string;
  mindmapData: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  createdById?: string | null;
  updatedById?: string | null;
}
