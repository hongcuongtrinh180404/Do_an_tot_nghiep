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
import { BaseAbstractDocument } from '../../base/index.js';
import { LessonEntity } from './lesson.schema.js';
let LessonQuizDraftEntity = class LessonQuizDraftEntity extends BaseAbstractDocument {
    id;
    lessonId;
    quizzes;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: LessonEntity.name,
        required: true,
    }),
    __metadata("design:type", String)
], LessonQuizDraftEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.Mixed,
        required: true,
    }),
    __metadata("design:type", Array)
], LessonQuizDraftEntity.prototype, "quizzes", void 0);
LessonQuizDraftEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_quiz_drafts' })
], LessonQuizDraftEntity);
export { LessonQuizDraftEntity };
export const LessonQuizDraftSchema = SchemaFactory.createForClass(LessonQuizDraftEntity);
LessonQuizDraftSchema.index({ lessonId: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
//# sourceMappingURL=lesson-quiz-draft.schema.js.map