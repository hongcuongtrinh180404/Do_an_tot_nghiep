import { JobStatusEnum } from '../enums/job-status.enum.js';
import { JobTypeEnum } from '../enums/job-type.enum.js';
import { JobPhaseEnum } from '../enums/job-phase.enum.js';

export interface IJob {
  id: string;
  type: JobTypeEnum;
  lessonId: string;
  courseId: string;
  requestedById: string;
  correlationId: string;
  idempotencyKey?: string | null;
  requestHash?: string | null;
  parameters: Record<string, unknown>;
  active: boolean;
  status: JobStatusEnum;
  phase: JobPhaseEnum;
  attempts: number;
  maxAttempts: number;
  nextRunAt?: Date | null;
  workerId?: string | null;
  leaseToken?: string | null;
  leaseExpiresAt?: Date | null;
  heartbeatAt?: Date | null;
  dispatchState: 'pending' | 'published';
  dispatchSequence: number;
  publishedAt?: Date | null;
  inputRevision: number;
  targetRevision: number;
  resultRef?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  retryOfJobId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
