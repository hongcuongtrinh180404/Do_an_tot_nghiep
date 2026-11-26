import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import {
  IJob,
  JobStatusEnum,
  JobTypeEnum,
  JobPhaseEnum,
} from 'share-lib';
import { BaseMongoRepository } from '../../base/repositories/base.mongo.repository.js';
import { Job, JobDocument } from '../schemas/job.schema.js';

@Injectable()
export class JobRepository extends BaseMongoRepository<IJob, Job, string> {
  constructor(@InjectModel(Job.name) private readonly jobModel: Model<Job>) {
    super(jobModel as unknown as Model<Job>);
  }

  protected override toDomain(doc: JobDocument | Job): IJob {
    const job = super.toDomain(doc);
    return {
      ...job,
      lessonId: job.lessonId.toString(),
      courseId: job.courseId.toString(),
      retryOfJobId: job.retryOfJobId?.toString() ?? job.retryOfJobId,
    };
  }

  /**
   * Tìm Job đang active của bài học theo loại tác vụ (Summary/Quiz/Mindmap/Transcript)
   */
  async findActiveByLessonAndType(
    lessonId: string,
    type: JobTypeEnum,
    session?: ClientSession,
  ): Promise<IJob | null> {
    const doc = await this.jobModel
      .findOne({
        lessonId,
        type,
        active: true,
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Tìm Job theo Idempotency-Key
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    session?: ClientSession,
  ): Promise<IJob | null> {
    const doc = await this.jobModel
      .findOne({
        idempotencyKey,
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async updateWithLease(
    jobId: string,
    leaseToken: string | null,
    payload: Partial<IJob>,
    session?: ClientSession,
    expiredBy?: Date,
  ): Promise<IJob | null> {
    const doc = await this.jobModel.findOneAndUpdate(
      {
        _id: jobId,
        deletedAt: null,
        status: JobStatusEnum.PROCESSING,
        leaseToken,
        ...(expiredBy ? { leaseExpiresAt: { $lte: expiredBy } } : {}),
      },
      { $set: payload },
      { new: true, session },
    ).exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Lấy danh sách Job gần nhất của bài học (bao gồm cả active và completed/failed gần đây)
   */
  async findRecentJobsByLesson(
    lessonId: string,
    limit = 10,
    session?: ClientSession,
  ): Promise<IJob[]> {
    const docs = await this.jobModel
      .find({
        lessonId,
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .session(session ?? null)
      .exec();

    return docs.map((d) => this.toDomain(d));
  }

  /**
   * Tìm các Job cần dispatch ra RabbitMQ (Embedded Outbox scanner)
   */
  async findPendingDispatches(
    limit = 10,
    now = new Date(),
    session?: ClientSession,
  ): Promise<IJob[]> {
    const docs = await this.jobModel
      .find({
        status: JobStatusEnum.QUEUED,
        dispatchState: 'pending',
        deletedAt: null,
        $or: [
          { nextRunAt: null },
          { nextRunAt: { $lte: now } },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .session(session ?? null)
      .exec();

    return docs.map((d) => this.toDomain(d));
  }

  /**
   * Đánh dấu Job đã dispatch thành công lên RabbitMQ
   */
  async markDispatched(
    jobId: string,
    dispatchSequence: number,
    session?: ClientSession,
  ): Promise<boolean> {
    const res = await this.jobModel
      .updateOne(
        {
          _id: jobId,
          dispatchSequence,
        },
        {
          $set: {
            dispatchState: 'published',
            publishedAt: new Date(),
            phase: JobPhaseEnum.WAITING_WORKER,
          },
        },
        { session },
      )
      .exec();

    return res.modifiedCount > 0;
  }

  /**
   * Atomic Claim Job: Worker nhận quyền xử lý bằng câu lệnh findOneAndUpdate nguyên tử.
   * Ngăn chặn hoàn toàn race condition khi nhiều worker cùng đọc message.
   */
  async claimJobAtomic(
    jobId: string,
    dispatchSequence: number,
    workerId: string,
    leaseToken: string,
    leaseDurationMs: number,
    now = new Date(),
  ): Promise<IJob | null> {
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    const updatedDoc = await this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          status: JobStatusEnum.QUEUED,
          dispatchSequence,
          deletedAt: null,
          $and: [
            {
              $or: [
                { nextRunAt: null },
                { nextRunAt: { $lte: now } },
              ],
            },
            {
              $or: [
                { leaseExpiresAt: null },
                { leaseExpiresAt: { $lte: now } },
              ],
            },
          ],
        },
        {
          $set: {
            status: JobStatusEnum.PROCESSING,
            phase: JobPhaseEnum.CALLING_AI,
            workerId,
            leaseToken,
            leaseExpiresAt,
            heartbeatAt: now,
            startedAt: now,
          },
          $inc: { attempts: 1 },
        },
        { new: true },
      )
      .exec();

    return updatedDoc ? this.toDomain(updatedDoc) : null;
  }

  /**
   * Gia hạn lease token khi Worker đang trong tiến trình xử lý dài (Heartbeat)
   */
  async renewLeaseAtomic(
    jobId: string,
    leaseToken: string,
    extendMs: number,
    now = new Date(),
  ): Promise<boolean> {
    const newExpiresAt = new Date(now.getTime() + extendMs);

    const res = await this.jobModel
      .updateOne(
        {
          _id: jobId,
          leaseToken,
          status: JobStatusEnum.PROCESSING,
        },
        {
          $set: {
            leaseExpiresAt: newExpiresAt,
            heartbeatAt: now,
          },
        },
      )
      .exec();

    return res.modifiedCount > 0;
  }

  /**
   * Quét các Job có lease bị quá hạn (Worker bị crash hoặc mất kết nối)
   */
  async findExpiredLeases(
    now = new Date(),
    limit = 10,
    session?: ClientSession,
  ): Promise<IJob[]> {
    const docs = await this.jobModel
      .find({
        status: JobStatusEnum.PROCESSING,
        active: true,
        deletedAt: null,
        leaseExpiresAt: { $lt: now },
      })
      .sort({ leaseExpiresAt: 1 })
      .limit(limit)
      .session(session ?? null)
      .exec();

    return docs.map((d) => this.toDomain(d));
  }
}
