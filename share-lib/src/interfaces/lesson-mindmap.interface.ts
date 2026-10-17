export interface ILessonMindmapNode {
  id: string;
  title: string;
  timestamp: number;
  children?: ILessonMindmapNode[];
}

export interface ILessonMindmapData {
  root: ILessonMindmapNode;
}

export interface ILessonMindmap {
  id: string;
  lessonId: string;
  mindmap: ILessonMindmapData;
  draftMindmap?: ILessonMindmapData | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
