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
let InstructorTermEntity = class InstructorTermEntity extends BaseAbstractDocument {
    title;
    content;
    isMandatory;
    order;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InstructorTermEntity.prototype, "title", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InstructorTermEntity.prototype, "content", void 0);
__decorate([
    Prop({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], InstructorTermEntity.prototype, "isMandatory", void 0);
__decorate([
    Prop({ type: Number, default: 0, index: true }),
    __metadata("design:type", Number)
], InstructorTermEntity.prototype, "order", void 0);
InstructorTermEntity = __decorate([
    Schema({ timestamps: true, collection: 'instructor_terms' })
], InstructorTermEntity);
export { InstructorTermEntity };
export const InstructorTermModelSchema = SchemaFactory.createForClass(InstructorTermEntity);
InstructorTermModelSchema.index({ order: 1, createdAt: 1 });
//# sourceMappingURL=instructor-term.schema.js.map