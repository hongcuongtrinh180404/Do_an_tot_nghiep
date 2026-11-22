import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  IJob,
  JobStatusEnum,
  JobTypeEnum,
  JobPhaseEnum,
} from 'share-lib';
import { BaseAbstractDocument } from '../../base/documents/base.abstract.document.js';

export type JobDocument = HydratedDocument<Job>;

@Schema({ collection: 'jobs', timestamps: true })
export class Job extends BaseAbstractDocument implements Omit<IJob, 'id'> {
  @Prop({ type: String, enum: Object.values(JobTypeEnum), required: true })
  type: JobTypeEnum;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true })
  lessonId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
  courseId: string;

  @Prop({ type: String, required: true })
  requestedById: string;

  @Prop({ type: String, required: true })
  correlationId: string;

  @Prop({ type: String, default: null })
  idempotencyKey?: string | null;

  @Prop({ type: String, default: null })
  requestHash?: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  parameters: Record<string, unknown>;

  @Prop({ type: Boolean, default: true, required: true })
  active: boolean;

  @Prop({
    type: String,
    enum: Object.values(JobStatusEnum),
    default: JobStatusEnum.QUEUED,
    required: true,
  })
  status: JobStatusEnum;

  @Prop({
    type: String,
    enum: Object.values(JobPhaseEnum),
    default: JobPhaseEnum.WAITING_DISPATCH,
    required: true,
  })
  phase: JobPhaseEnum;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts: number;

  @Prop({ type: Date, default: null })
  nextRunAt?: Date | null;

  @Prop({ type: String, default: null })
  workerId?: string | null;

  @Prop({ type: String, default: null })
  leaseToken?: string | null;

  @Prop({ type: Date, default: null })
  leaseExpiresAt?: Date | null;

  @Prop({ type: Date, default: null })
  heartbeatAt?: Date | null;

  @Prop({ type: String, enum: ['pending', 'published'], default: 'pending', required: true })
  dispatchState: 'pending' | 'published';

  @Prop({ type: Number, default: 1 })
  dispatchSequence: number;

  @Prop({ type: Date, default: null })
  publishedAt?: Date | null;

  @Prop({ type: Number, default: 0 })
  inputRevision: number;

  @Prop({ type: Number, default: 0 })
  targetRevision: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  resultRef?: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  errorCode?: string | null;

  @Prop({ type: String, default: null })
  errorMessage?: string | null;

  @Prop({ type: Date, default: null })
  startedAt?: Date | null;

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  @Prop({ type: Date, default: null })
  failedAt?: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Job', default: null })
  retryOfJobId?: string | null;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// 1. Chống trùng request từ client qua Idempotency-Key
JobSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true, name: 'uniq_jobs_idempotencyKey' },
);

// 2. Chống chạy đồng thời 2 job cùng loại trên 1 bài học (Critical Active Fencing)
JobSchema.index(
  { lessonId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'uniq_jobs_active_lesson_type',
  },
);

// 3. Phục vụ Dispatcher và Retry scheduler
JobSchema.index(
  { status: 1, nextRunAt: 1, dispatchState: 1 },
  { name: 'idx_jobs_dispatch_scheduler' },
);

// 4. Phục vụ Recovery Service quét lease quá hạn
JobSchema.index(
  { status: 1, leaseExpiresAt: 1 },
  { name: 'idx_jobs_lease_recovery' },
);

// 5. Phục vụ truy vấn danh sách Job theo bài học
JobSchema.index(
  { lessonId: 1, createdAt: -1 },
  { name: 'idx_jobs_lesson_created' },
);

// 6. Phục vụ kiểm tra giới hạn Job active theo người dùng
JobSchema.index(
  { requestedById: 1, active: 1 },
  { name: 'idx_jobs_requested_active' },
);

// 7. TTL index tự động dọn dẹp các job terminal sau 30 ngày (2592000 giây)
JobSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 3600,
    partialFilterExpression: { active: false },
    name: 'ttl_jobs_terminal_cleanup',
  },
);
