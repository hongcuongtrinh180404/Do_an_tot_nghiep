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
import { Schema as MongoSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
let LearningProgressEntity = class LearningProgressEntity extends BaseAbstractDocument {
    userId;
    courseId;
    watchedMs;
    lastLessonId;
    lastMediaUrl;
    lastPositionSeconds;
    sessionId;
    sessionLessonId;
    sessionMediaUrl;
    sessionExpiresAt;
    lastHeartbeatAt;
    sessionWatchedMs;
    lastSequence;
    sessionClosed;
    revision;
};
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LearningProgressEntity.prototype, "userId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, required: true }),
    __metadata("design:type", Types.ObjectId)
], LearningProgressEntity.prototype, "courseId", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], LearningProgressEntity.prototype, "watchedMs", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "lastLessonId", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "lastMediaUrl", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], LearningProgressEntity.prototype, "lastPositionSeconds", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "sessionId", void 0);
__decorate([
    Prop({ type: MongoSchema.Types.ObjectId, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "sessionLessonId", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "sessionMediaUrl", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "sessionExpiresAt", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], LearningProgressEntity.prototype, "lastHeartbeatAt", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], LearningProgressEntity.prototype, "sessionWatchedMs", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], LearningProgressEntity.prototype, "lastSequence", void 0);
__decorate([
    Prop({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], LearningProgressEntity.prototype, "sessionClosed", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], LearningProgressEntity.prototype, "revision", void 0);
LearningProgressEntity = __decorate([
    Schema({ timestamps: true, collection: 'learning_progress' })
], LearningProgressEntity);
export { LearningProgressEntity };
export const LearningProgressSchema = SchemaFactory.createForClass(LearningProgressEntity);
LearningProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
//# sourceMappingURL=learning-progress.schema.js.map