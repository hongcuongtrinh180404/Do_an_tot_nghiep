export {
  CourseStatusEnum,
  CourseLevelEnum,
} from 'share-lib';

export type {
  ICourse,
  ICreateCoursePayload,
} from 'share-lib';

export interface ICourseApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
