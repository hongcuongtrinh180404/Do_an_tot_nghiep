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
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseCategoryEntity } from './course-category.schema.js';
let CourseEntity = class CourseEntity extends BaseAbstractDocument {
    title;
    slug;
    description;
    tags;
    thumbnailUrl;
    trailerUrl;
    price;
    originalPrice;
    instructorId;
    status;
    approvalRequestedAt;
    approvalRequestedById;
    rejectionReason;
    reviewedAt;
    reviewedById;
    level;
    categoryId;
    ratingAvg;
    reviewCount;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], CourseEntity.prototype, "title", void 0);
__decorate([
    Prop({ type: String, required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], CourseEntity.prototype, "slug", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "description", void 0);
__decorate([
    Prop({
        type: [{ type: String, trim: true, maxlength: 100 }],
        default: [],
        validate: {
            validator: (tags) => tags.length <= 20,
            message: 'A course can have at most 20 tags',
        },
    }),
    __metadata("design:type", Array)
], CourseEntity.prototype, "tags", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "thumbnailUrl", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "trailerUrl", void 0);
__decorate([
    Prop({ type: Number, required: true, default: 0, min: [0, 'Course price cannot be negative'] }),
    __metadata("design:type", Number)
], CourseEntity.prototype, "price", void 0);
__decorate([
    Prop({ type: Number, required: false, default: null, min: [0, 'Original price cannot be negative'] }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "originalPrice", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], CourseEntity.prototype, "instructorId", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(CourseStatusEnum),
        default: CourseStatusEnum.DRAFT,
        index: true,
    }),
    __metadata("design:type", String)
], CourseEntity.prototype, "status", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "approvalRequestedAt", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, default: null }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "approvalRequestedById", void 0);
__decorate([
    Prop({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "rejectionReason", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "reviewedAt", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, default: null }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "reviewedById", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(CourseLevelEnum),
        default: CourseLevelEnum.ALL_LEVELS,
        index: true,
    }),
    __metadata("design:type", String)
], CourseEntity.prototype, "level", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: CourseCategoryEntity.name,
        default: null,
        index: true,
    }),
    __metadata("design:type", Object)
], CourseEntity.prototype, "categoryId", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0, max: 5 }),
    __metadata("design:type", Number)
], CourseEntity.prototype, "ratingAvg", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], CourseEntity.prototype, "reviewCount", void 0);
CourseEntity = __decorate([
    Schema({ timestamps: true, collection: 'courses' })
], CourseEntity);
export { CourseEntity };
export const CourseSchema = SchemaFactory.createForClass(CourseEntity);
CourseSchema.index({ slug: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
CourseSchema.index({ instructorId: 1, deletedAt: 1, createdAt: -1 });
CourseSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });
CourseSchema.index({ categoryId: 1, status: 1, deletedAt: 1, createdAt: -1 });
CourseSchema.index({ status: 1, approvalRequestedAt: -1, deletedAt: 1 });
CourseSchema.index({ status: 1, ratingAvg: -1, reviewCount: -1, deletedAt: 1 });
//# sourceMappingURL=course.schema.js.map