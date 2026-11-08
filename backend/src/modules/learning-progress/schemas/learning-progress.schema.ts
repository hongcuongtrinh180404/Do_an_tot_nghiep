import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongoSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';

@Schema({ timestamps: true, collection: 'learning_progress' })
export class LearningProgressEntity extends BaseAbstractDocument {
  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  courseId: Types.ObjectId;

  // Never cap the stored total: it must survive future curriculum changes.
  @Prop({ type: Number, default: 0, min: 0 })
  watchedMs: number;

  @Prop({ type: MongoSchema.Types.ObjectId, default: null })
  lastLessonId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  lastMediaUrl: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  lastPositionSeconds: number;

  @Prop({ type: String, default: null })
  sessionId: string | null;

  @Prop({ type: MongoSchema.Types.ObjectId, default: null })
  sessionLessonId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  sessionMediaUrl: string | null;

  @Prop({ type: Date, default: null })
  sessionExpiresAt: Date | null;

  @Prop({ type: Date, default: null })
  lastHeartbeatAt: Date | null;

  @Prop({ type: Number, default: 0 })
  sessionWatchedMs: number;

  @Prop({ type: Number, default: 0 })
  lastSequence: number;

  @Prop({ type: Boolean, default: false })
  sessionClosed: boolean;

  @Prop({ type: Number, default: 0 })
  revision: number;
}

export const LearningProgressSchema = SchemaFactory.createForClass(LearningProgressEntity);
LearningProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export interface LearningProgressState {
  id: string;
  userId: string;
  courseId: string;
  watchedMs: number;
  lastLessonId: string | null;
  lastMediaUrl: string | null;
  lastPositionSeconds: number;
  sessionId: string | null;
  sessionLessonId: string | null;
  sessionMediaUrl: string | null;
  sessionExpiresAt: Date | null;
  lastHeartbeatAt: Date | null;
  sessionWatchedMs: number;
  lastSequence: number;
  sessionClosed: boolean;
  revision: number;
  updatedAt: Date;
}
