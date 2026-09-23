import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true, collection: 'users' })
export class UserEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: false, default: null, lowercase: true, trim: true })
  username?: string | null;

  @Prop({ type: String, required: false, default: null })
  avatarUrl?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  bio?: string | null;

  @Prop({
    type: String,
    enum: Object.values(RoleEnum),
    default: RoleEnum.STUDENT,
    index: true,
  })
  role: RoleEnum;

  @Prop({
    type: String,
    enum: Object.values(UserStatusEnum),
    default: UserStatusEnum.ACTIVE,
    index: true,
  })
  status: UserStatusEnum;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);

// Partial Unique Indexes: chỉ áp dụng khi deletedAt === null
// 1. Unique email cho các user đang hoạt động (chưa soft-delete)
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

// 2. Unique username cho các user đang hoạt động và có username dạng string
UserSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      username: { $type: 'string' },
    },
  },
);

// Compound & sorting indexes
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ deletedAt: 1, createdAt: -1 });

