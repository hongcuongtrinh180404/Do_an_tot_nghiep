import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
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

@Injectable()
export class CommissionSettingRepository extends BaseMongoRepository<
  ICommissionSettingDomain,
  CommissionSettingEntity
> {
  constructor(
    @InjectModel(CommissionSettingEntity.name)
    model: Model<CommissionSettingEntity>,
  ) {
    super(model, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => unknown }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);
      return {
        ...plain,
        id: String(plain._id),
        appliedById:
          plain.appliedById instanceof Types.ObjectId
            ? plain.appliedById.toHexString()
            : typeof plain.appliedById === 'string'
              ? plain.appliedById
              : null,
      } as unknown as ICommissionSettingDomain;
    });
  }

  async getCurrentSetting(session?: ClientSession): Promise<ICommissionSettingDomain | null> {
    const doc = await this.model
      .findOne({ isCurrent: true, deletedAt: null })
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .lean()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async updateDefaultRate(
    defaultRate: number,
    adminId: string,
    session?: ClientSession,
  ): Promise<ICommissionSettingDomain> {
    const updateOptions = session ? { session } : {};
    await this.model
      .updateMany(
        { isCurrent: true },
        { $set: { isCurrent: false } },
        updateOptions,
      )
      .exec();

    const created = await this.model.create(
      [
        {
          defaultRate,
          isCurrent: true,
          appliedById: new Types.ObjectId(adminId),
          createdById: adminId,
          updatedById: adminId,
        },
      ],
      updateOptions,
    );

    return this.toDomain(created[0]);
  }
}
