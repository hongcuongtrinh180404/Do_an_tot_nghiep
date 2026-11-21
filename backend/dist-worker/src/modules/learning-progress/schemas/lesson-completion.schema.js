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
import { Schema as MongoSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
let LessonQuizAnswerEntity = class LessonQuizAnswerEntity extends BaseAbstractDocument {
    userId;
    courseId;
    lessonId;
    quizId;
    quizRevision;
    selectedOptionIds;
    isCorrect;
    correctOptionIds;
    quizSnapshot;
    submittedAt;
};
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonQuizAnswerEntity.prototype, "userId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonQuizAnswerEntity.prototype, "courseId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonQuizAnswerEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonQuizAnswerEntity.prototype, "quizId", void 0);
__decorate([
    Prop({ required: true }),
    __metadata("design:type", String)
], LessonQuizAnswerEntity.prototype, "quizRevision", void 0);
__decorate([
    Prop({ type: [String], required: true }),
    __metadata("design:type", Array)
], LessonQuizAnswerEntity.prototype, "selectedOptionIds", void 0);
__decorate([
    Prop({ required: true }),
    __metadata("design:type", Boolean)
], LessonQuizAnswerEntity.prototype, "isCorrect", void 0);
__decorate([
    Prop({ type: [String], required: true }),
    __metadata("design:type", Array)
], LessonQuizAnswerEntity.prototype, "correctOptionIds", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.Mixed, required: true }),
    __metadata("design:type", Object)
], LessonQuizAnswerEntity.prototype, "quizSnapshot", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], LessonQuizAnswerEntity.prototype, "submittedAt", void 0);
LessonQuizAnswerEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_quiz_answers' })
], LessonQuizAnswerEntity);
export { LessonQuizAnswerEntity };
export const LessonQuizAnswerSchema = SchemaFactory.createForClass(LessonQuizAnswerEntity);
LessonQuizAnswerSchema.index({ userId: 1, lessonId: 1, quizId: 1, quizRevision: 1 }, { unique: true });
LessonQuizAnswerSchema.index({ userId: 1, courseId: 1 });
let LessonVideoCompletionEntity = class LessonVideoCompletionEntity extends BaseAbstractDocument {
    userId;
    courseId;
    lessonId;
    mediaVersion;
    endedAt;
};
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonVideoCompletionEntity.prototype, "userId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonVideoCompletionEntity.prototype, "courseId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LessonVideoCompletionEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({ required: true }),
    __metadata("design:type", String)
], LessonVideoCompletionEntity.prototype, "mediaVersion", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], LessonVideoCompletionEntity.prototype, "endedAt", void 0);
LessonVideoCompletionEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_video_completions' })
], LessonVideoCompletionEntity);
export { LessonVideoCompletionEntity };
export const LessonVideoCompletionSchema = SchemaFactory.createForClass(LessonVideoCompletionEntity);
LessonVideoCompletionSchema.index({ userId: 1, lessonId: 1, mediaVersion: 1 }, { unique: true });
//# sourceMappingURL=lesson-completion.schema.js.map