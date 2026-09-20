import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RoleEnum, UserStatusEnum, AuthProviderEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true, collection: 'users' })
export class UserEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: false, select: false, default: null })
  password?: string | null;

  @Prop({ type: String, required: false, trim: true, default: null })
  firstName?: string | null;

  @Prop({ type: String, required: false, trim: true, default: null })
  lastName?: string | null;

  @Prop({ type: String, required: false, default: null })
  avatar?: string | null;

  @Prop({
    type: String,
    enum: Object.values(RoleEnum),
    default: RoleEnum.USER,
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

  @Prop({
    type: String,
    enum: Object.values(AuthProviderEnum),
    default: AuthProviderEnum.LOCAL,
  })
  provider: AuthProviderEnum;

  @Prop({ type: String, required: false, default: null })
  providerId?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);

// Compound indexes
UserSchema.index({ email: 1, deletedAt: 1 }, { unique: true });
UserSchema.index({ provider: 1, providerId: 1 });
UserSchema.index({ deletedAt: 1, createdAt: -1 });
