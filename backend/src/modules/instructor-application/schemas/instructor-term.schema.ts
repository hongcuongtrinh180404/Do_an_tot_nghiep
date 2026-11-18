import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';

export type InstructorTermDocument = HydratedDocument<InstructorTermEntity>;

@Schema({ timestamps: true, collection: 'instructor_terms' })
export class InstructorTermEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  content: string;

  @Prop({ type: Boolean, default: true })
  isMandatory: boolean;

  @Prop({ type: Number, default: 0, index: true })
  order: number;
}

export const InstructorTermModelSchema =
  SchemaFactory.createForClass(InstructorTermEntity);

InstructorTermModelSchema.index({ order: 1, createdAt: 1 });
