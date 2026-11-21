import { Model } from 'mongoose';
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { LessonEntity } from '../../course/schemas/lesson.schema.js';
export interface OwnedCourseRow {
    enrollmentId: string;
    id: string;
    title: string;
    enrolledAt: Date;
    publicDetail: boolean;
}
export interface OwnedCourseCursor {
    enrolledAt: Date;
    enrollmentId: string;
}
export declare const CHATBOT_LEARNING_BATCH_SIZE = 50;
export declare const CHATBOT_LEARNING_QUERY_MS = 1500;
export declare class ChatbotMyCoursesRepository {
    private readonly enrollments;
    private readonly lessons;
    constructor(enrollments: Model<EnrollmentEntity>, lessons: Model<LessonEntity>);
    batch(userId: string, options?: {
        keyword?: string;
        courseId?: string;
        after?: OwnedCourseCursor;
    }): Promise<OwnedCourseRow[]>;
    resumeTitle(courseId: string, lessonId: string): Promise<string | null>;
}
