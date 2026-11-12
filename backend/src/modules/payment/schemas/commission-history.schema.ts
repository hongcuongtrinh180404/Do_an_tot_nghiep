import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';

export type CommissionHistoryDocument = HydratedDocument<CommissionHistoryEntity>;

@Schema({ timestamps: true, collection: 'commission_histories' })
export class CommissionHistoryEntity extends BaseAbstractDocument {
  @Prop({
    type: String,
    enum: ['SYSTEM', 'INSTRUCTOR'],
    default: 'INSTRUCTOR',
    index: true,
  })
  targetType: 'SYSTEM' | 'INSTRUCTOR';

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    required: false,
    index: true,
  })
  instructorId?: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  oldRate: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  newRate: number;

  @Prop({ type: String, required: true, trim: true })
  reason: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    required: true,
  })
  appliedById: Types.ObjectId;
}

export const CommissionHistorySchema = SchemaFactory.createForClass(CommissionHistoryEntity);

CommissionHistorySchema.index({ instructorId: 1, createdAt: -1 });
CommissionHistorySchema.index({ targetType: 1, createdAt: -1 });

