var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { LessonTranscriptionStatusEnum, } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';
let TranscribedSentenceEntity = class TranscribedSentenceEntity {
    text;
    start;
    end;
};
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], TranscribedSentenceEntity.prototype, "text", void 0);
__decorate([
    Prop({ type: Number, required: true }),
    __metadata("design:type", Number)
], TranscribedSentenceEntity.prototype, "start", void 0);
__decorate([
    Prop({ type: Number, required: true }),
    __metadata("design:type", Number)
], TranscribedSentenceEntity.prototype, "end", void 0);
TranscribedSentenceEntity = __decorate([
    Schema({ _id: false })
], TranscribedSentenceEntity);
export { TranscribedSentenceEntity };
export const TranscribedSentenceSchema = SchemaFactory.createForClass(TranscribedSentenceEntity);
let LessonTranscriptEntity = class LessonTranscriptEntity extends BaseAbstractDocument {
    lessonId;
    rawTranscript;
    sentences;
    durationSeconds;
    languageCode;
    externalTranscriptId;
    status;
    failureReason;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: LessonEntity.name,
        required: true,
    }),
    __metadata("design:type", Types.ObjectId)
], LessonTranscriptEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({ type: String, required: true, default: '' }),
    __metadata("design:type", String)
], LessonTranscriptEntity.prototype, "rawTranscript", void 0);
__decorate([
    Prop({ type: [TranscribedSentenceSchema], default: [] }),
    __metadata("design:type", Array)
], LessonTranscriptEntity.prototype, "sentences", void 0);
__decorate([
    Prop({ type: Number, required: true, default: 0 }),
    __metadata("design:type", Number)
], LessonTranscriptEntity.prototype, "durationSeconds", void 0);
__decorate([
    Prop({ type: String, required: true, default: 'vi' }),
    __metadata("design:type", String)
], LessonTranscriptEntity.prototype, "languageCode", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], LessonTranscriptEntity.prototype, "externalTranscriptId", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(LessonTranscriptionStatusEnum),
        default: LessonTranscriptionStatusEnum.IDLE,
        required: true,
    }),
    __metadata("design:type", String)
], LessonTranscriptEntity.prototype, "status", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], LessonTranscriptEntity.prototype, "failureReason", void 0);
LessonTranscriptEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_transcripts' })
], LessonTranscriptEntity);
export { LessonTranscriptEntity };
export const LessonTranscriptSchema = SchemaFactory.createForClass(LessonTranscriptEntity);
LessonTranscriptSchema.index({ lessonId: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
//# sourceMappingURL=lesson-transcript.schema.js.map