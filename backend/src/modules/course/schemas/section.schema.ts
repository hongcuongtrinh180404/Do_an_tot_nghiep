import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { CourseEntity } from './course.schema.js';

export type SectionDocument = HydratedDocument<SectionEntity>;

@Schema({ timestamps: true, collection: 'sections' })
export class SectionEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseEntity.name,
    required: true,
    index: true,
  })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  description?: string | null;

  @Prop({
    type: Number,
    required: true,
    min: [0, 'Section order cannot be negative'],
  })
  order: number;
}

export const SectionSchema = SchemaFactory.createForClass(SectionEntity);

// --- INDEXES ---
// Compound index for efficient ordered retrieval of sections within a course, filtering soft-deleted sections
SectionSchema.index({ courseId: 1, deletedAt: 1, order: 1 });
