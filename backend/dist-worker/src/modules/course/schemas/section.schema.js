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
import { BaseAbstractDocument } from '../../base/index.js';
import { CourseEntity } from './course.schema.js';
let SectionEntity = class SectionEntity extends BaseAbstractDocument {
    courseId;
    title;
    description;
    order;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: CourseEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], SectionEntity.prototype, "courseId", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], SectionEntity.prototype, "title", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], SectionEntity.prototype, "description", void 0);
__decorate([
    Prop({
        type: Number,
        required: true,
        min: [0, 'Section order cannot be negative'],
    }),
    __metadata("design:type", Number)
], SectionEntity.prototype, "order", void 0);
SectionEntity = __decorate([
    Schema({ timestamps: true, collection: 'sections' })
], SectionEntity);
export { SectionEntity };
export const SectionSchema = SchemaFactory.createForClass(SectionEntity);
SectionSchema.index({ courseId: 1, deletedAt: 1, order: 1 });
//# sourceMappingURL=section.schema.js.map