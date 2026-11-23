import { Model, Types } from 'mongoose';
import { type IAdminUserEnrolledCourse, type IAdminUserTeachingCourse } from 'share-lib';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
export type AdminEnrollmentRow = Omit<IAdminUserEnrolledCourse, 'totalLessons' | 'completedLessons' | 'progressPercent' | 'status'>;
export type AdminTeachingRow = Omit<IAdminUserTeachingCourse, 'studentCount' | 'revenue' | 'rating' | 'reviewCount'>;
export interface AdminCourseRevenue {
    _id: Types.ObjectId;
    totalRevenue: number;
    instructorEarnings: number;
    platformCommission: number;
    successfulSales: number;
    reconstructedOrders: number;
    invalidMoney: number;
}
export interface AdminCourseReviewStats {
    courseId: string;
    totalScore: number;
    totalReviews: number;
}
export declare class AdminUserCoursesRepository {
    private readonly courses;
    private readonly enrollments;
    private readonly orders;
    constructor(courses: Model<CourseEntity>, enrollments: Model<EnrollmentEntity>, orders: Model<OrderEntity>);
    findEnrolledCourses(userId: string): Promise<AdminEnrollmentRow[]>;
    findTeachingCourses(userId: string): Promise<AdminTeachingRow[]>;
    getTeachingRevenue(userId: string): Promise<AdminCourseRevenue[]>;
    getStudentCounts(courseIds: string[]): Promise<{
        total: number;
        byCourse: Map<string, number>;
    }>;
    getReviewStats(courseIds: string[]): Promise<AdminCourseReviewStats[]>;
}
