var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Prop, Schema } from '@nestjs/mongoose';
let BaseAbstractDocument = class BaseAbstractDocument {
    _id;
    createdAt;
    updatedAt;
    deletedAt;
    createdById;
    updatedById;
};
__decorate([
    Prop({ type: Date, default: null, index: true }),
    __metadata("design:type", Object)
], BaseAbstractDocument.prototype, "deletedAt", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], BaseAbstractDocument.prototype, "createdById", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], BaseAbstractDocument.prototype, "updatedById", void 0);
BaseAbstractDocument = __decorate([
    Schema({ timestamps: true })
], BaseAbstractDocument);
export { BaseAbstractDocument };
//# sourceMappingURL=base.abstract.document.js.map