import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { SectionEntity } from './section.schema.js';

export type LessonDocument = HydratedDocument<LessonEntity>;

@Schema({ timestamps: true, collection: 'lessons' })
export class LessonEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: SectionEntity.name,
    required: true,
    index: true,
  })
  sectionId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  description?: string | null;

  @Prop({
    type: Number,
    required: true,
    min: [0, 'Lesson order cannot be negative'],
  })
  order: number;
}

export const LessonSchema = SchemaFactory.createForClass(LessonEntity);

// --- INDEXES ---
// Compound index for efficient ordered retrieval of lessons within a section, filtering soft-deleted lessons
LessonSchema.index({ sectionId: 1, deletedAt: 1, order: 1 });
