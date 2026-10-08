import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  ITranscribedSentence,
  LessonTranscriptionStatusEnum,
} from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';

export type LessonTranscriptDocument = HydratedDocument<LessonTranscriptEntity>;

@Schema({ _id: false })
export class TranscribedSentenceEntity implements ITranscribedSentence {
  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: Number, required: true })
  start: number;

  @Prop({ type: Number, required: true })
  end: number;
}

export const TranscribedSentenceSchema = SchemaFactory.createForClass(TranscribedSentenceEntity);

@Schema({ timestamps: true, collection: 'lesson_transcripts' })
export class LessonTranscriptEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: LessonEntity.name,
    required: true,
  })
  lessonId: Types.ObjectId;

  @Prop({ type: String, required: true, default: '' })
  rawTranscript: string;

  @Prop({ type: [TranscribedSentenceSchema], default: [] })
  sentences: TranscribedSentenceEntity[];

  @Prop({ type: Number, required: true, default: 0 })
  durationSeconds: number;

  @Prop({ type: String, required: true, default: 'vi' })
  languageCode: string;

  @Prop({ type: String, required: false, default: null })
  externalTranscriptId?: string | null;

  @Prop({
    type: String,
    enum: Object.values(LessonTranscriptionStatusEnum),
    default: LessonTranscriptionStatusEnum.IDLE,
    required: true,
  })
  status: LessonTranscriptionStatusEnum;

  @Prop({ type: String, required: false, default: null })
  failureReason?: string | null;
}

export const LessonTranscriptSchema = SchemaFactory.createForClass(LessonTranscriptEntity);

LessonTranscriptSchema.index(
  { lessonId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
