import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';

export type SessionDocument = HydratedDocument<SessionEntity>;

@Schema({ timestamps: true, collection: 'sessions' })
export class SessionEntity extends BaseAbstractDocument {
  @Prop({ type: Types.ObjectId, required: true, ref: 'UserEntity', index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  refreshTokenHash: string;

  @Prop({ type: String, default: null, index: true })
  previousRefreshTokenHash?: string | null;

  @Prop({ type: Date, default: null })
  hashRotatedAt?: Date | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isRevoked: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(SessionEntity);

// TTL Index auto-deleting expired session records
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1, isRevoked: 1 });
