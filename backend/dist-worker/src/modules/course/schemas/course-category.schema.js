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
import { BaseAbstractDocument } from '../../base/index.js';
let CourseCategoryEntity = class CourseCategoryEntity extends BaseAbstractDocument {
    name;
    slug;
    description;
    imageUrl;
    order;
    isActive;
};
__decorate([
    Prop({ type: String, required: true, trim: true, maxlength: 100 }),
    __metadata("design:type", String)
], CourseCategoryEntity.prototype, "name", void 0);
__decorate([
    Prop({ type: String, required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], CourseCategoryEntity.prototype, "slug", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], CourseCategoryEntity.prototype, "description", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], CourseCategoryEntity.prototype, "imageUrl", void 0);
__decorate([
    Prop({ type: Number, required: true, default: 0, min: 0 }),
    __metadata("design:type", Number)
], CourseCategoryEntity.prototype, "order", void 0);
__decorate([
    Prop({ type: Boolean, required: true, default: true, index: true }),
    __metadata("design:type", Boolean)
], CourseCategoryEntity.prototype, "isActive", void 0);
CourseCategoryEntity = __decorate([
    Schema({ timestamps: true, collection: 'course_categories' })
], CourseCategoryEntity);
export { CourseCategoryEntity };
export const CourseCategorySchema = SchemaFactory.createForClass(CourseCategoryEntity);
CourseCategorySchema.index({ slug: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
CourseCategorySchema.index({ isActive: 1, order: 1, name: 1 });
//# sourceMappingURL=course-category.schema.js.map