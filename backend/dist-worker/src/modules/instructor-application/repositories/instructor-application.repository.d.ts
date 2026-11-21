import { Model, Types, ClientSession } from 'mongoose';
import { IInstructorApplication, InstructorApplicationStatusEnum, type IAdminInstructorApplicationsStats } from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { InstructorApplicationEntity, InstructorApplicationDocument } from '../schemas/instructor-application.schema.js';
import { QueryInstructorApplicationsDto } from '../dto/query-instructor-applications.dto.js';
export declare class InstructorApplicationRepository extends BaseMongoRepository<IInstructorApplication, InstructorApplicationDocument, string> {
    constructor(applicationModel: Model<InstructorApplicationDocument>);
    findApplicationsWithFilter(queryDto: QueryInstructorApplicationsDto, session?: ClientSession): Promise<PaginationResult<IInstructorApplication>>;
    countPending(session?: ClientSession): Promise<number>;
    getStats(session?: ClientSession): Promise<IAdminInstructorApplicationsStats>;
    findByUserId(userId: string, session?: ClientSession): Promise<IInstructorApplication | null>;
    updateStatus(id: string, status: InstructorApplicationStatusEnum, reviewMeta?: {
        reviewedById?: Types.ObjectId | null;
        reviewedByName?: string | null;
        rejectionReason?: string | null;
        reviewedAt?: Date;
    }, historyItem?: {
        action: string;
        actorId: Types.ObjectId;
        actorName: string;
        actorRole: string;
        comment?: string | null;
        timestamp: Date;
    }, session?: ClientSession): Promise<IInstructorApplication | null>;
    createWithHistory(data: Partial<InstructorApplicationEntity>, historyItem: {
        action: string;
        actorId: Types.ObjectId;
        actorName: string;
        actorRole: string;
        comment?: string | null;
        timestamp: Date;
    }, session?: ClientSession): Promise<IInstructorApplication>;
    resubmitApplication(id: string, updateData: Partial<InstructorApplicationEntity>, historyItem: {
        action: string;
        actorId: Types.ObjectId;
        actorName: string;
        actorRole: string;
        comment?: string | null;
        timestamp: Date;
    }, session?: ClientSession): Promise<IInstructorApplication | null>;
    deleteMany(filter: Record<string, unknown>, session?: ClientSession): Promise<number>;
}
