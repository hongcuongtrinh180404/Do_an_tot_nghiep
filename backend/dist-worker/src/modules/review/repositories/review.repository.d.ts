import { Model, ClientSession } from 'mongoose';
import { IReview, ICourseReviewStats, IAdminReviewStats, IReviewModerationEntry, IReviewReportEntry, IInstructorReviewReply, IAdminReviewReply } from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { ReviewEntity, ReviewDocument } from '../schemas/review.schema.js';
import { AdminQueryReviewsDto } from '../dto/admin-query-reviews.dto.js';
export declare class ReviewRepository extends BaseMongoRepository<IReview, ReviewDocument, string> {
    constructor(reviewModel: Model<ReviewDocument>);
    findByUserAndCourse(userId: string, courseId: string, session?: ClientSession): Promise<IReview | null>;
    findCourseReviews(courseId: string, page?: number, limit?: number, session?: ClientSession): Promise<PaginationResult<IReview>>;
    calculateCourseReviewStats(courseId: string, session?: ClientSession): Promise<ICourseReviewStats>;
    findReviewByIdWithDetails(id: string, session?: ClientSession): Promise<IReview | null>;
    findAdminReviews(dto: AdminQueryReviewsDto, session?: ClientSession): Promise<PaginationResult<IReview>>;
    getAdminStats(session?: ClientSession): Promise<IAdminReviewStats>;
    addModerationEntry(reviewId: string, entry: IReviewModerationEntry, updateFields: Partial<ReviewEntity>, session?: ClientSession): Promise<IReview | null>;
    addReportEntry(reviewId: string, report: IReviewReportEntry, session?: ClientSession): Promise<IReview | null>;
    dismissReports(reviewId: string, session?: ClientSession): Promise<IReview | null>;
    setAdminReply(reviewId: string, reply: IAdminReviewReply, session?: ClientSession): Promise<IReview | null>;
    setInstructorReply(reviewId: string, reply: IInstructorReviewReply, session?: ClientSession): Promise<IReview | null>;
    clearInstructorReply(reviewId: string, session?: ClientSession): Promise<IReview | null>;
    calculateInstructorReviewStats(instructorId: string, courseId?: string, session?: ClientSession): Promise<ICourseReviewStats>;
    findInstructorReviews(instructorId: string, params: {
        courseId?: string;
        rating?: number;
        sort?: string;
        page?: number;
        limit?: number;
    }, session?: ClientSession): Promise<PaginationResult<IReview>>;
}
