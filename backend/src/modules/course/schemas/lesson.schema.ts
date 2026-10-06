import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ILessonContent, ILessonMaterial, LessonContentTypeEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { SectionEntity } from './section.schema.js';

export type LessonDocument = HydratedDocument<LessonEntity>;

@Schema({ _id: false })
export class LessonContentEntity implements ILessonContent {
  @Prop({
    type: String,
    enum: Object.values(LessonContentTypeEnum),
    required: true,
  })
  type: LessonContentTypeEnum;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: false, default: null })
  publicId?: string;

  @Prop({ type: String, required: false, default: null })
  fileName?: string;

  @Prop({ type: Number, required: false, default: null, min: 0 })
  fileSize?: number;

  @Prop({ type: String, required: false, default: null })
  mimeType?: string;

  @Prop({ type: Number, required: false, default: null, min: 0 })
  duration?: number;
}

export const LessonContentSchema = SchemaFactory.createForClass(LessonContentEntity);

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class LessonMaterialEntity implements ILessonMaterial {
  _id: Types.ObjectId;

  id: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: Number, required: false, default: null, min: 0 })
  fileSize?: number;

  @Prop({ type: String, required: false, default: null })
  mimeType?: string;

  @Prop({ type: String, required: false, default: null })
  publicId?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const LessonMaterialSchema = SchemaFactory.createForClass(LessonMaterialEntity);

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

  @Prop({ type: LessonContentSchema, required: false, default: null })
  content?: ILessonContent | null;

  @Prop({ type: [LessonMaterialSchema], default: [] })
  materials: LessonMaterialEntity[];

  @Prop({ type: Boolean, required: true, default: false })
  isPreview: boolean;
}

export const LessonSchema = SchemaFactory.createForClass(LessonEntity);

// --- INDEXES ---
// Compound index for efficient ordered retrieval of lessons within a section, filtering soft-deleted lessons
LessonSchema.index({ sectionId: 1, deletedAt: 1, order: 1 });
