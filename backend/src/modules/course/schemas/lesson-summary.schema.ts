import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { ILessonSummary, ILessonSummaryData } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';

export type LessonSummaryDocument = HydratedDocument<LessonSummaryEntity>;

@Schema({ timestamps: true, collection: 'lesson_summaries' })
export class LessonSummaryEntity extends BaseAbstractDocument implements ILessonSummary {
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
  summary: ILessonSummaryData;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: false,
    default: null,
  })
  draftSummary?: ILessonSummaryData | null;
}

export const LessonSummarySchema = SchemaFactory.createForClass(LessonSummaryEntity);

LessonSummarySchema.index(
  { lessonId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
