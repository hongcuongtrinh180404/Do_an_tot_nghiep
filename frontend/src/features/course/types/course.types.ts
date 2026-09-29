export {
  CourseStatusEnum,
  CourseLevelEnum,
} from 'share-lib';

export type {
  ICourse,
  ICreateCoursePayload,
  ISection,
} from 'share-lib';

export interface ICourseApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
