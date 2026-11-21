import { Model, ClientSession } from 'mongoose';
import { BaseMongoRepository } from '../../base/index.js';
import { CommissionHistoryEntity } from '../schemas/commission-history.schema.js';
export interface ICommissionHistoryDomain {
    id: string;
    targetType: 'SYSTEM' | 'INSTRUCTOR';
    instructorId?: string | null;
    oldRate: number;
    newRate: number;
    reason: string;
    appliedById: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CommissionHistoryRepository extends BaseMongoRepository<ICommissionHistoryDomain, CommissionHistoryEntity> {
    constructor(model: Model<CommissionHistoryEntity>);
    findByInstructorId(instructorId: string, session?: ClientSession): Promise<ICommissionHistoryDomain[]>;
}
