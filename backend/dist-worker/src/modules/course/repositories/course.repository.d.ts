import { Model, ClientSession } from 'mongoose';
import { IAdminCourseStats, ICourse, CourseStatusEnum } from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { CourseEntity } from '../schemas/course.schema.js';
import { QueryCoursesAdminDto } from '../dto/query-courses-admin.dto.js';
import { QueryPublicCoursesDto } from '../dto/query-public-courses.dto.js';
export declare class CourseRepository extends BaseMongoRepository<ICourse, CourseEntity> {
    constructor(courseModel: Model<CourseEntity>);
    findById(id: string, session?: ClientSession): Promise<ICourse | null>;
    updateRatingStats(courseId: string, ratingAvg: number, reviewCount: number, session?: ClientSession): Promise<void>;
    findForEnrollment(id: string, session: ClientSession): Promise<Pick<ICourse, 'id' | 'price' | 'status' | 'instructorId' | 'deletedAt'> | null>;
    findBySlug(slug: string, session?: ClientSession): Promise<ICourse | null>;
    requestApproval(course: ICourse, userId: string): Promise<ICourse | null>;
    withdrawApproval(courseId: string, userId: string, session?: ClientSession): Promise<ICourse | null>;
    updateStatus(courseId: string, fromStatus: CourseStatusEnum, toStatus: CourseStatusEnum, userId: string, session?: ClientSession): Promise<ICourse | null>;
    approveCourse(courseId: string, adminId: string, session?: ClientSession): Promise<ICourse | null>;
    rejectCourse(courseId: string, adminId: string, reason: string, session?: ClientSession): Promise<ICourse | null>;
    getAdminCourseStats(session?: ClientSession): Promise<IAdminCourseStats>;
    findAdminCoursesWithPagination(queryDto: QueryCoursesAdminDto, session?: ClientSession): Promise<PaginationResult<ICourse>>;
    findByInstructorId(instructorId: string, session?: ClientSession): Promise<ICourse[]>;
    countByCategoryId(categoryId: string): Promise<number>;
    countByCategoryIds(options?: {
        onlyPublished?: boolean;
    }): Promise<Map<string, number>>;
    findConflictingSlugs(baseSlug: string, excludeCourseId?: string, session?: ClientSession): Promise<string[]>;
    findPublicCoursesWithPagination(queryDto: QueryPublicCoursesDto, categoryId?: string | null, session?: ClientSession): Promise<PaginationResult<ICourse>>;
    findPublicCourseDetail(idOrSlug: string, session?: ClientSession, includeUnpublished?: boolean): Promise<ICourse | null>;
}
