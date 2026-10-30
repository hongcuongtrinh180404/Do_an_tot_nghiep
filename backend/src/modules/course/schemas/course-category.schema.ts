import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';

export type CourseCategoryDocument = HydratedDocument<CourseCategoryEntity>;

@Schema({ timestamps: true, collection: 'course_categories' })
export class CourseCategoryEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  description?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  imageUrl?: string | null;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  order: number;

  @Prop({ type: Boolean, required: true, default: true, index: true })
  isActive: boolean;
}

export const CourseCategorySchema = SchemaFactory.createForClass(CourseCategoryEntity);

// --- INDEXES ---
// 1. Partial Unique Slug Index: cho phép tái sử dụng slug sau khi xóa mềm
CourseCategorySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

// 2. Public Listing Index: lọc danh mục đang hiển thị và sắp xếp theo thứ tự
CourseCategorySchema.index({ isActive: 1, order: 1, name: 1 });
