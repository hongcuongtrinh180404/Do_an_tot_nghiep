import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { CourseEntity } from './course.schema.js';

export type CourseMindmapDocument = HydratedDocument<CourseMindmapEntity>;

@Schema({ timestamps: true, collection: 'course_mindmaps' })
export class CourseMindmapEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseEntity.name,
    required: true,
  })
  courseId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  mindmapData: Record<string, unknown>;
}

export const CourseMindmapSchema = SchemaFactory.createForClass(CourseMindmapEntity);

// --- INDEXES ---
// Partial unique index ensures that each course has only one active mindmap document,
// while allowing reuse/soft-delete handling via deletedAt: null filter.
CourseMindmapSchema.index(
  { courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
