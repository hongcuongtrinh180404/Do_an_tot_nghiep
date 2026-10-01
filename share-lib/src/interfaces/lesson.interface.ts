import { LessonContentTypeEnum } from '../enums/lesson-content-type.enum.js';

export interface ILessonContent {
  type: LessonContentTypeEnum;
  url: string;
  publicId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
}

export interface ILesson {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  order: number;
  content?: ILessonContent | null;
  isPreview: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface ICreateLessonPayload {
  title: string;
  description?: string | null;
  order: number;
  content?: ILessonContent | null;
  isPreview?: boolean;
}
