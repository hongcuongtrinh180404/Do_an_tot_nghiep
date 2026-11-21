import { Model, ClientSession } from 'mongoose';
import { BaseMongoRepository } from '../../base/index.js';
import { CommissionSettingEntity } from '../schemas/commission-setting.schema.js';
export interface ICommissionSettingDomain {
    id: string;
    defaultRate: number;
    isCurrent: boolean;
    appliedById?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CommissionSettingRepository extends BaseMongoRepository<ICommissionSettingDomain, CommissionSettingEntity> {
    constructor(model: Model<CommissionSettingEntity>);
    getCurrentSetting(session?: ClientSession): Promise<ICommissionSettingDomain | null>;
    updateDefaultRate(defaultRate: number, adminId: string, session?: ClientSession): Promise<ICommissionSettingDomain>;
}
