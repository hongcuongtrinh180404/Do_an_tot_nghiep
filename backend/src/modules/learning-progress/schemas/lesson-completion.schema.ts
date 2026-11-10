import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongoSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';

@Schema({ timestamps: true, collection: 'lesson_quiz_answers' })
export class LessonQuizAnswerEntity extends BaseAbstractDocument {
  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  courseId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  lessonId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  quizId: Types.ObjectId;

  @Prop({ required: true })
  quizRevision: string;

  @Prop({ type: [String], required: true })
  selectedOptionIds: string[];

  @Prop({ required: true })
  isCorrect: boolean;

  @Prop({ type: [String], required: true })
  correctOptionIds: string[];

  @Prop({ type: MongoSchema.Types.Mixed, required: true })
  quizSnapshot: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  submittedAt: Date;
}

export const LessonQuizAnswerSchema = SchemaFactory.createForClass(LessonQuizAnswerEntity);
LessonQuizAnswerSchema.index({ userId: 1, lessonId: 1, quizId: 1, quizRevision: 1 }, { unique: true });
LessonQuizAnswerSchema.index({ userId: 1, courseId: 1 });

@Schema({ timestamps: true, collection: 'lesson_video_completions' })
export class LessonVideoCompletionEntity extends BaseAbstractDocument {
  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  courseId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, required: true })
  lessonId: Types.ObjectId;

  @Prop({ required: true })
  mediaVersion: string;

  @Prop({ type: Date, required: true })
  endedAt: Date;
}

export const LessonVideoCompletionSchema = SchemaFactory.createForClass(LessonVideoCompletionEntity);
LessonVideoCompletionSchema.index({ userId: 1, lessonId: 1, mediaVersion: 1 }, { unique: true });
