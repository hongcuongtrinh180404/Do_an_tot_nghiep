import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';

export type CommissionSettingDocument = HydratedDocument<CommissionSettingEntity>;

@Schema({ timestamps: true, collection: 'commission_settings' })
export class CommissionSettingEntity extends BaseAbstractDocument {
  @Prop({ type: Number, required: true, default: 30, min: 0, max: 100 })
  defaultRate: number;

  @Prop({ type: Boolean, default: true, index: true })
  isCurrent: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    default: null,
  })
  appliedById?: Types.ObjectId | null;
}

export const CommissionSettingSchema = SchemaFactory.createForClass(CommissionSettingEntity);

CommissionSettingSchema.index({ isCurrent: 1 });

