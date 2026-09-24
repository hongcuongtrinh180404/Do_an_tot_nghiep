export type {
  ICourse,
  ICreateCoursePayload,
  CourseStatusEnum,
  CourseLevelEnum,
} from 'share-lib';

export interface ICourseApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
