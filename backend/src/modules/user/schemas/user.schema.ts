import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true, collection: 'users' })
export class UserEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: false, select: false, default: null })
  passwordHash?: string | null;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: false, default: null, lowercase: true, trim: true })
  username?: string | null;

  @Prop({ type: String, required: false, default: null })
  avatarUrl?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  googleSub?: string | null;

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

  @Prop({ type: Boolean, default: false, index: true })
  isEmailVerified: boolean;

  @Prop({ type: String, required: false, default: null, select: false })
  emailVerificationToken?: string | null;

  @Prop({ type: Date, required: false, default: null, select: false })
  emailVerificationExpires?: Date | null;

  @Prop({ type: String, required: false, default: null, select: false })
  passwordResetTokenHash?: string | null;

  @Prop({ type: Date, required: false, default: null, select: false })
  passwordResetExpires?: Date | null;

  @Prop({ type: Date, required: false, default: null, select: false })
  passwordResetRequestedAt?: Date | null;
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

// 3. Unique googleSub cho các user có liên kết Google OAuth
UserSchema.index(
  { googleSub: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      googleSub: { $type: 'string' },
    },
  },
);

// 4. Index cho emailVerificationToken (chỉ đánh index cho các document có token)
UserSchema.index(
  { emailVerificationToken: 1 },
  {
    partialFilterExpression: {
      deletedAt: null,
      emailVerificationToken: { $type: 'string' },
    },
  },
);

// 5. Index cho passwordResetTokenHash (chỉ đánh index cho các document có token)
// KHÔNG dùng TTL index cho passwordResetExpires: TTL sẽ xóa toàn bộ document user.
UserSchema.index(
  { passwordResetTokenHash: 1 },
  {
    partialFilterExpression: {
      deletedAt: null,
      passwordResetTokenHash: { $type: 'string' },
    },
  },
);

// Compound & sorting indexes
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ deletedAt: 1, createdAt: -1 });

