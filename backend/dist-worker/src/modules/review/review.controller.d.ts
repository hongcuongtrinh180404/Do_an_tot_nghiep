import { IReview, ICourseReviewStats, IReviewEligibility, IAdminReviewStats } from 'share-lib';
import { ApiResponse, PaginationResult } from '../base/index.js';
import { ReviewService } from './services/review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { QueryReviewsDto } from './dto/query-reviews.dto.js';
import { AdminQueryReviewsDto } from './dto/admin-query-reviews.dto.js';
import { HideReviewDto } from './dto/hide-review.dto.js';
import { RestoreReviewDto } from './dto/restore-review.dto.js';
import { AdminDeleteReviewDto } from './dto/admin-delete-review.dto.js';
import { ReportReviewDto } from './dto/report-review.dto.js';
import { InstructorQueryReviewsDto } from './dto/instructor-query-reviews.dto.js';
import { ReplyReviewDto } from './dto/reply-review.dto.js';
export declare class ReviewController {
    private readonly reviewService;
    constructor(reviewService: ReviewService);
    adminGetStats(): Promise<ApiResponse<IAdminReviewStats>>;
    adminGetReviews(query: AdminQueryReviewsDto): Promise<ApiResponse<PaginationResult<IReview>>>;
    adminGetReviewDetail(id: string): Promise<ApiResponse<IReview>>;
    adminReplyToReview(id: string, adminId: string, dto: ReplyReviewDto): Promise<ApiResponse<IReview>>;
    adminHideReview(id: string, adminId: string, dto: HideReviewDto): Promise<ApiResponse<IReview>>;
    adminRestoreReview(id: string, adminId: string, dto: RestoreReviewDto): Promise<ApiResponse<IReview>>;
    adminDeleteReview(id: string, adminId: string, dto: AdminDeleteReviewDto): Promise<ApiResponse<{
        success: boolean;
    }>>;
    adminDismissReports(id: string, adminId: string): Promise<ApiResponse<IReview>>;
    getCourseStats(courseId: string): Promise<ApiResponse<ICourseReviewStats>>;
    getCourseReviews(courseId: string, query: QueryReviewsDto): Promise<ApiResponse<PaginationResult<IReview>>>;
    checkEligibility(courseId: string, userId: string): Promise<ApiResponse<IReviewEligibility>>;
    getMyReview(courseId: string, userId: string): Promise<ApiResponse<IReview | null>>;
    createReview(courseId: string, userId: string, dto: CreateReviewDto): Promise<ApiResponse<IReview>>;
    reportReview(id: string, userId: string, dto: ReportReviewDto): Promise<ApiResponse<IReview>>;
    updateReview(id: string, userId: string, dto: UpdateReviewDto): Promise<ApiResponse<IReview>>;
    deleteReview(id: string, userId: string): Promise<ApiResponse<{
        success: boolean;
    }>>;
    getInstructorStats(instructorId: string, courseId?: string): Promise<ApiResponse<ICourseReviewStats>>;
    getInstructorReviews(instructorId: string, query: InstructorQueryReviewsDto): Promise<ApiResponse<PaginationResult<IReview>>>;
    replyToReview(id: string, instructorId: string, dto: ReplyReviewDto): Promise<ApiResponse<IReview>>;
    deleteInstructorReply(id: string, instructorId: string): Promise<ApiResponse<IReview>>;
}
