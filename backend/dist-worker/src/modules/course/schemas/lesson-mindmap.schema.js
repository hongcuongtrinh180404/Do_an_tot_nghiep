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
let LessonMindmapEntity = class LessonMindmapEntity extends BaseAbstractDocument {
    id;
    lessonId;
    mindmap;
    draftMindmap;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: LessonEntity.name,
        required: true,
    }),
    __metadata("design:type", String)
], LessonMindmapEntity.prototype, "lessonId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.Mixed,
        required: true,
    }),
    __metadata("design:type", Object)
], LessonMindmapEntity.prototype, "mindmap", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.Mixed,
        required: false,
        default: null,
    }),
    __metadata("design:type", Object)
], LessonMindmapEntity.prototype, "draftMindmap", void 0);
LessonMindmapEntity = __decorate([
    Schema({ timestamps: true, collection: 'lesson_mindmaps' })
], LessonMindmapEntity);
export { LessonMindmapEntity };
export const LessonMindmapSchema = SchemaFactory.createForClass(LessonMindmapEntity);
LessonMindmapSchema.index({ lessonId: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
//# sourceMappingURL=lesson-mindmap.schema.js.map