import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { IGeneratedQuizItem, ILessonQuizDraft } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';

export type LessonQuizDraftDocument = HydratedDocument<LessonQuizDraftEntity>;

@Schema({ timestamps: true, collection: 'lesson_quiz_drafts' })
export class LessonQuizDraftEntity extends BaseAbstractDocument implements ILessonQuizDraft {
  id: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: LessonEntity.name,
    required: true,
  })
  lessonId: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  quizzes: IGeneratedQuizItem[];
}

export const LessonQuizDraftSchema = SchemaFactory.createForClass(LessonQuizDraftEntity);

// Partial unique index ensures each lesson has at most one active quiz draft
LessonQuizDraftSchema.index(
  { lessonId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
