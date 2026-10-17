import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { ILessonMindmap, ILessonMindmapData } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';

export type LessonMindmapDocument = HydratedDocument<LessonMindmapEntity>;

@Schema({ timestamps: true, collection: 'lesson_mindmaps' })
export class LessonMindmapEntity extends BaseAbstractDocument implements ILessonMindmap {
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
  mindmap: ILessonMindmapData;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: false,
    default: null,
  })
  draftMindmap?: ILessonMindmapData | null;
}

export const LessonMindmapSchema = SchemaFactory.createForClass(LessonMindmapEntity);

// Partial unique index ensures each lesson has at most one active mindmap
LessonMindmapSchema.index(
  { lessonId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
