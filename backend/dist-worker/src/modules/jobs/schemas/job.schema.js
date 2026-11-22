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
import { JobStatusEnum, JobTypeEnum, JobPhaseEnum, } from 'share-lib';
import { BaseAbstractDocument } from '../../base/documents/base.abstract.document.js';
let Job = class Job extends BaseAbstractDocument {
    type;
    lessonId;
    courseId;
    requestedById;
    correlationId;
    idempotencyKey;
    requestHash;
    parameters;
    active;
    status;
    phase;
    attempts;
    maxAttempts;
    nextRunAt;
    workerId;
    leaseToken;
    leaseExpiresAt;
    heartbeatAt;
    dispatchState;
    dispatchSequence;
    publishedAt;
    inputRevision;
    targetRevision;
    resultRef;
    errorCode;
    errorMessage;
    startedAt;
    completedAt;
    failedAt;
    retryOfJobId;
};
__decorate([
    Prop({ type: String, enum: Object.values(JobTypeEnum), required: true }),
    __metadata("design:type", String)
], Job.prototype, "type", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true }),
    __metadata("design:type", String)
], Job.prototype, "lessonId", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true }),
    __metadata("design:type", String)
], Job.prototype, "courseId", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], Job.prototype, "requestedById", void 0);
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], Job.prototype, "correlationId", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "idempotencyKey", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "requestHash", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], Job.prototype, "parameters", void 0);
__decorate([
    Prop({ type: Boolean, default: true, required: true }),
    __metadata("design:type", Boolean)
], Job.prototype, "active", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(JobStatusEnum),
        default: JobStatusEnum.QUEUED,
        required: true,
    }),
    __metadata("design:type", String)
], Job.prototype, "status", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(JobPhaseEnum),
        default: JobPhaseEnum.WAITING_DISPATCH,
        required: true,
    }),
    __metadata("design:type", String)
], Job.prototype, "phase", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "attempts", void 0);
__decorate([
    Prop({ type: Number, default: 3 }),
    __metadata("design:type", Number)
], Job.prototype, "maxAttempts", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "nextRunAt", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "workerId", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "leaseToken", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "leaseExpiresAt", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "heartbeatAt", void 0);
__decorate([
    Prop({ type: String, enum: ['pending', 'published'], default: 'pending', required: true }),
    __metadata("design:type", String)
], Job.prototype, "dispatchState", void 0);
__decorate([
    Prop({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], Job.prototype, "dispatchSequence", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "publishedAt", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "inputRevision", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Job.prototype, "targetRevision", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.Mixed, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "resultRef", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "errorCode", void 0);
__decorate([
    Prop({ type: String, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "errorMessage", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "startedAt", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "completedAt", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], Job.prototype, "failedAt", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Job', default: null }),
    __metadata("design:type", Object)
], Job.prototype, "retryOfJobId", void 0);
Job = __decorate([
    Schema({ collection: 'jobs', timestamps: true })
], Job);
export { Job };
export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true, name: 'uniq_jobs_idempotencyKey' });
JobSchema.index({ lessonId: 1, type: 1 }, {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'uniq_jobs_active_lesson_type',
});
JobSchema.index({ status: 1, nextRunAt: 1, dispatchState: 1 }, { name: 'idx_jobs_dispatch_scheduler' });
JobSchema.index({ status: 1, leaseExpiresAt: 1 }, { name: 'idx_jobs_lease_recovery' });
JobSchema.index({ lessonId: 1, createdAt: -1 }, { name: 'idx_jobs_lesson_created' });
JobSchema.index({ requestedById: 1, active: 1 }, { name: 'idx_jobs_requested_active' });
JobSchema.index({ updatedAt: 1 }, {
    expireAfterSeconds: 30 * 24 * 3600,
    partialFilterExpression: { active: false },
    name: 'ttl_jobs_terminal_cleanup',
});
//# sourceMappingURL=job.schema.js.map