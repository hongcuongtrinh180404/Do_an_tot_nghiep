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
let LessonSummaryEntity = class LessonSummaryEntity extends BaseAbstractDocument {
    id;
    lessonId;
    summary;
    draftSummary;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: LessonEntity.name,
        required: true,
    }),
    __metadata("design:type", String)
], LessonSummaryEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.Mixed,
        required: true,
    }),
    __metadata("design:type", Object)
], LessonSummaryEntity.prototype, "summary", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.Mixed,
        required: false,
        default: null,
    }),
    __metadata("design:type", Object)
], LessonSummaryEntity.prototype, "draftSummary", void 0);
LessonSummaryEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_summaries' })
], LessonSummaryEntity);
export { LessonSummaryEntity };
export const LessonSummarySchema = SchemaFactory.createForClass(LessonSummaryEntity);
LessonSummarySchema.index({ lessonId: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
//# sourceMappingURL=lesson-summary.schema.js.map