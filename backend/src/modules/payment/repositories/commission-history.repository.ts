import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
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

@Injectable()
export class CommissionHistoryRepository extends BaseMongoRepository<
  ICommissionHistoryDomain,
  CommissionHistoryEntity
> {
  constructor(
    @InjectModel(CommissionHistoryEntity.name)
    model: Model<CommissionHistoryEntity>,
  ) {
    super(model, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => unknown }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);
      return {
        ...plain,
        id: String(plain._id),
        targetType:
          plain.targetType === 'SYSTEM' || plain.targetType === 'INSTRUCTOR'
            ? plain.targetType
            : plain.instructorId
              ? 'INSTRUCTOR'
              : 'SYSTEM',
        instructorId: plain.instructorId ? String(plain.instructorId) : null,
        appliedById: String(plain.appliedById),
      } as unknown as ICommissionHistoryDomain;
    });
  }

  async findByInstructorId(
    instructorId: string,
    session?: ClientSession,
  ): Promise<ICommissionHistoryDomain[]> {
    const docs = await this.model
      .find({
        $or: [
          { instructorId: new Types.ObjectId(instructorId) },
          { targetType: 'SYSTEM' },
        ],
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d));
  }
}

