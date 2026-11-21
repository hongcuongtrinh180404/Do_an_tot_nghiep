import { Model, ClientSession, Types } from 'mongoose';
import { CourseApprovalActionEnum, type IAdminCourseApprovalHistoryStats, type ICourseApprovalHistory } from 'share-lib';
import { BaseMongoRepository, type PaginationResult } from '../../base/index.js';
import { CourseApprovalHistoryEntity } from '../schemas/course-approval-history.schema.js';
import { QueryCourseApprovalHistoryDto } from '../dto/query-course-approval-history.dto.js';
export declare class CourseApprovalHistoryRepository extends BaseMongoRepository<ICourseApprovalHistory, CourseApprovalHistoryEntity> {
    constructor(model: Model<CourseApprovalHistoryEntity>);
    createHistory(entry: {
        courseId: string | Types.ObjectId;
        adminId: string | Types.ObjectId;
        instructorId: string | Types.ObjectId;
        action: CourseApprovalActionEnum;
        previousStatus: string;
        targetStatus: string;
        reason?: string | null;
    }, session?: ClientSession): Promise<ICourseApprovalHistory>;
    findAdminHistoriesWithPagination(query: QueryCourseApprovalHistoryDto, session?: ClientSession): Promise<PaginationResult<ICourseApprovalHistory>>;
    getStats(session?: ClientSession): Promise<IAdminCourseApprovalHistoryStats>;
    findByCourseId(courseId: string, session?: ClientSession): Promise<ICourseApprovalHistory[]>;
}
