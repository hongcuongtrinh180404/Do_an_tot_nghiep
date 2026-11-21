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
import { Schema as MongooseSchema } from 'mongoose';
import { QuizQuestionTypeEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';
let QuizOptionEntity = class QuizOptionEntity {
    id;
    label;
    text;
    isCorrect;
};
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], QuizOptionEntity.prototype, "id", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], QuizOptionEntity.prototype, "label", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], QuizOptionEntity.prototype, "text", void 0);
__decorate([
    Prop({ type: Boolean, required: true, default: false }),
    __metadata("design:type", Boolean)
], QuizOptionEntity.prototype, "isCorrect", void 0);
QuizOptionEntity = __decorate([
    Schema({ _id: false })
], QuizOptionEntity);
export { QuizOptionEntity };
export const QuizOptionSchema = SchemaFactory.createForClass(QuizOptionEntity);
let LessonQuizEntity = class LessonQuizEntity extends BaseAbstractDocument {
    id;
    lessonId;
    timestamp;
    explanationTimestamp;
    order;
    question;
    questionType;
    options;
    explanation;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: LessonEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", String)
], LessonQuizEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({ type: Number, default: null, min: 0 }),
    __metadata("design:type", Object)
], LessonQuizEntity.prototype, "timestamp", void 0);
__decorate([
    Prop({ type: Number, default: null, min: 0 }),
    __metadata("design:type", Object)
], LessonQuizEntity.prototype, "explanationTimestamp", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 1, default: 1 }),
    __metadata("design:type", Number)
], LessonQuizEntity.prototype, "order", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], LessonQuizEntity.prototype, "question", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(QuizQuestionTypeEnum),
        default: QuizQuestionTypeEnum.SINGLE,
        required: true,
    }),
    __metadata("design:type", String)
], LessonQuizEntity.prototype, "questionType", void 0);
__decorate([
    Prop({ type: [QuizOptionSchema], default: [], required: true }),
    __metadata("design:type", Array)
], LessonQuizEntity.prototype, "options", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], LessonQuizEntity.prototype, "explanation", void 0);
LessonQuizEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_quizzes', toJSON: { virtuals: true }, toObject: { virtuals: true } })
], LessonQuizEntity);
export { LessonQuizEntity };
export const LessonQuizSchema = SchemaFactory.createForClass(LessonQuizEntity);
LessonQuizSchema.index({ lessonId: 1, deletedAt: 1, timestamp: 1, order: 1 });
//# sourceMappingURL=lesson-quiz.schema.js.map