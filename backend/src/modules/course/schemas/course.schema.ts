import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseCategoryEntity } from './course-category.schema.js';

export type CourseDocument = HydratedDocument<CourseEntity>;

@Schema({ timestamps: true, collection: 'courses' })
export class CourseEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  shortDescription?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  description?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  thumbnailUrl?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  trailerUrl?: string | null;

  @Prop({ type: Number, required: true, default: 0, min: [0, 'Course price cannot be negative'] })
  price: number;

  @Prop({ type: Number, required: false, default: null, min: [0, 'Original price cannot be negative'] })
  originalPrice?: number | null;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    required: true,
    index: true,
  })
  instructorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(CourseStatusEnum),
    default: CourseStatusEnum.DRAFT,
    index: true,
  })
  status: CourseStatusEnum;

  @Prop({
    type: String,
    enum: Object.values(CourseLevelEnum),
    default: CourseLevelEnum.ALL_LEVELS,
    index: true,
  })
  level: CourseLevelEnum;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseCategoryEntity.name,
    default: null,
    index: true,
  })
  categoryId?: Types.ObjectId | null;
}

export const CourseSchema = SchemaFactory.createForClass(CourseEntity);

// --- INDEXES ---
// 1. Partial Unique Slug Index: Ensures slug uniqueness among active courses, allows reuse after soft-delete
CourseSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

// 2. Instructor Management Index: Optimized for querying an instructor's courses
CourseSchema.index({ instructorId: 1, deletedAt: 1, createdAt: -1 });

// 3. Published Catalog Query Index: Optimized for public course catalog filtering & sorting
CourseSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

// 4. Category Catalog Query Index: lọc khóa học theo danh mục cho catalog công khai
CourseSchema.index({ categoryId: 1, status: 1, deletedAt: 1, createdAt: -1 });
