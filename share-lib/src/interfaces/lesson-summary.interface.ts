export interface ILessonSummaryKeyPoint {
  title: string;
  content: string;
  timestamp?: number;
}

export interface ILessonSummaryData {
  title: string;
  overview: string;
  keyPoints: ILessonSummaryKeyPoint[];
  conclusion?: string;
}

export interface IUpdateLessonSummaryPayload {
  title: string;
  overview: string;
  keyPoints: ILessonSummaryKeyPoint[];
}

export interface ILessonSummary {
  id: string;
  lessonId: string;
  summary: ILessonSummaryData;
  draftSummary?: ILessonSummaryData | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
