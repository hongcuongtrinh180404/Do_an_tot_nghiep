import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ILessonQuiz, IQuizOption, QuizQuestionTypeEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';

export type LessonQuizDocument = HydratedDocument<LessonQuizEntity>;

@Schema({ _id: false })
export class QuizOptionEntity implements IQuizOption {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true, trim: true })
  label: string;

  @Prop({ type: String, required: true, trim: true })
  text: string;

  @Prop({ type: Boolean, required: true, default: false })
  isCorrect: boolean;
}

export const QuizOptionSchema = SchemaFactory.createForClass(QuizOptionEntity);

@Schema({ timestamps: true, collection: 'lesson_quizzes', toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class LessonQuizEntity extends BaseAbstractDocument {
  id?: string;
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: LessonEntity.name,
    required: true,
    index: true,
  })
  lessonId: string;

  @Prop({ type: Number, required: true, min: 0 })
  timestamp: number;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  order: number;

  @Prop({ type: String, required: true, trim: true })
  question: string;

  @Prop({
    type: String,
    enum: Object.values(QuizQuestionTypeEnum),
    default: QuizQuestionTypeEnum.SINGLE,
    required: true,
  })
  questionType: QuizQuestionTypeEnum;

  @Prop({ type: [QuizOptionSchema], default: [], required: true })
  options: QuizOptionEntity[];

  @Prop({ type: String, required: false, default: null, trim: true })
  explanation?: string | null;
}

export const LessonQuizSchema = SchemaFactory.createForClass(LessonQuizEntity);

// Compound index for optimal sorting and retrieval of quizzes by lesson and timestamp
LessonQuizSchema.index({ lessonId: 1, deletedAt: 1, timestamp: 1, order: 1 });
