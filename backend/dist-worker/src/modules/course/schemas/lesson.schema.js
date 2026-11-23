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
import { LessonContentTypeEnum, LessonTranscriptionStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { SectionEntity } from './section.schema.js';
let LessonContentEntity = class LessonContentEntity {
    type;
    url;
    publicId;
    fileName;
    fileSize;
    mimeType;
    duration;
};
__decorate([
    Prop({
        type: String,
        enum: Object.values(LessonContentTypeEnum),
        required: true,
    }),
    __metadata("design:type", String)
], LessonContentEntity.prototype, "type", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], LessonContentEntity.prototype, "url", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", String)
], LessonContentEntity.prototype, "publicId", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", String)
], LessonContentEntity.prototype, "fileName", void 0);
__decorate([
    Prop({ type: Number, required: false, default: null, min: 0 }),
    __metadata("design:type", Number)
], LessonContentEntity.prototype, "fileSize", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", String)
], LessonContentEntity.prototype, "mimeType", void 0);
__decorate([
    Prop({ type: Number, required: false, default: null, min: 0 }),
    __metadata("design:type", Number)
], LessonContentEntity.prototype, "duration", void 0);
LessonContentEntity = __decorate([
    Schema({ _id: false })
], LessonContentEntity);
export { LessonContentEntity };
export const LessonContentSchema = SchemaFactory.createForClass(LessonContentEntity);
let LessonMaterialEntity = class LessonMaterialEntity {
    _id;
    id;
    title;
    url;
    fileName;
    fileSize;
    mimeType;
    publicId;
    createdAt;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], LessonMaterialEntity.prototype, "title", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], LessonMaterialEntity.prototype, "url", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], LessonMaterialEntity.prototype, "fileName", void 0);
__decorate([
    Prop({ type: Number, required: false, default: null, min: 0 }),
    __metadata("design:type", Number)
], LessonMaterialEntity.prototype, "fileSize", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", String)
], LessonMaterialEntity.prototype, "mimeType", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", String)
], LessonMaterialEntity.prototype, "publicId", void 0);
__decorate([
    Prop({ type: Date, default: Date.now }),
    __metadata("design:type", Date)
], LessonMaterialEntity.prototype, "createdAt", void 0);
LessonMaterialEntity = __decorate([
    Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
], LessonMaterialEntity);
export { LessonMaterialEntity };
export const LessonMaterialSchema = SchemaFactory.createForClass(LessonMaterialEntity);
let LessonEntity = class LessonEntity extends BaseAbstractDocument {
    sectionId;
    title;
    order;
    content;
    materials;
    isPreview;
    transcriptionStatus;
    analysisInputRevision;
    analysisOutputRevisions;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: SectionEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], LessonEntity.prototype, "sectionId", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], LessonEntity.prototype, "title", void 0);
__decorate([
    Prop({
        type: Number,
        required: true,
        min: [0, 'Lesson order cannot be negative'],
    }),
    __metadata("design:type", Number)
], LessonEntity.prototype, "order", void 0);
__decorate([
    Prop({ type: LessonContentSchema, required: true }),
    __metadata("design:type", Object)
], LessonEntity.prototype, "content", void 0);
__decorate([
    Prop({ type: [LessonMaterialSchema], default: [] }),
    __metadata("design:type", Array)
], LessonEntity.prototype, "materials", void 0);
__decorate([
    Prop({ type: Boolean, required: true, default: false }),
    __metadata("design:type", Boolean)
], LessonEntity.prototype, "isPreview", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(LessonTranscriptionStatusEnum),
        default: LessonTranscriptionStatusEnum.IDLE,
        required: true,
    }),
    __metadata("design:type", String)
], LessonEntity.prototype, "transcriptionStatus", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], LessonEntity.prototype, "analysisInputRevision", void 0);
__decorate([
    Prop({
        type: {
            summary: { type: Number, default: 0 },
            quiz: { type: Number, default: 0 },
            mindmap: { type: Number, default: 0 },
        },
        default: () => ({ summary: 0, quiz: 0, mindmap: 0 }),
        _id: false,
    }),
    __metadata("design:type", Object)
], LessonEntity.prototype, "analysisOutputRevisions", void 0);
LessonEntity = __decorate([
    Schema({ timestamps: true, collection: 'lessons' })
], LessonEntity);
export { LessonEntity };
export const LessonSchema = SchemaFactory.createForClass(LessonEntity);
LessonSchema.index({ sectionId: 1, deletedAt: 1, order: 1 });
//# sourceMappingURL=lesson.schema.js.map