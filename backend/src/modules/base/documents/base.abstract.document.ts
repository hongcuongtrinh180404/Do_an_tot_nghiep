import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export abstract class BaseAbstractDocument {
  _id: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;

  @Prop({ type: String, default: null })
  createdById?: string | null;

  @Prop({ type: String, default: null })
  updatedById?: string | null;
}
