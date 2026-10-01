export {
  CourseStatusEnum,
  CourseLevelEnum,
  LessonContentTypeEnum,
} from 'share-lib';

export type {
  ICourse,
  ICreateCoursePayload,
  ISection,
  ILesson,
  ILessonContent,
} from 'share-lib';

export interface ICourseApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
