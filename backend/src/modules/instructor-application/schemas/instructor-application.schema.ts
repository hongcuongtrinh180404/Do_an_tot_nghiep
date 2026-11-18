import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { InstructorApplicationStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';

export type InstructorApplicationDocument = HydratedDocument<InstructorApplicationEntity>;

@Schema({ timestamps: true, collection: 'instructor_applications' })
export class InstructorApplicationEntity extends BaseAbstractDocument {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  applicantName: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  phone: string;

  @Prop({ type: String, required: false, default: null })
  avatarUrl?: string | null;

  @Prop({ type: [String], default: [] })
  expertises: string[];

  @Prop({ type: String, required: true, trim: true })
  bio: string;

  @Prop({ type: String, required: true, trim: true })
  experience: string;

  @Prop({ type: String, required: false, default: null })
  cvFileName?: string | null;

  @Prop({ type: String, required: false, default: null })
  cvFileUrl?: string | null;

  @Prop({
    type: String,
    enum: Object.values(InstructorApplicationStatusEnum),
    default: InstructorApplicationStatusEnum.PENDING,
    index: true,
  })
  status: InstructorApplicationStatusEnum;

  @Prop({ type: String, required: false, default: null, trim: true })
  rejectionReason?: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: false, default: null })
  reviewedById?: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  reviewedByName?: string | null;

  @Prop({ type: Date, required: false, default: null })
  reviewedAt?: Date | null;
}

export const InstructorApplicationModelSchema =
  SchemaFactory.createForClass(InstructorApplicationEntity);

InstructorApplicationModelSchema.index({ status: 1, createdAt: -1 });
InstructorApplicationModelSchema.index({ email: 1 });
InstructorApplicationModelSchema.index({ userId: 1 });
