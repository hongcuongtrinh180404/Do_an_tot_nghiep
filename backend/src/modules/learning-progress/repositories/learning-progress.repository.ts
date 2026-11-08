import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseMongoRepository } from '../../base/index.js';
import { LearningProgressEntity, type LearningProgressState } from '../schemas/learning-progress.schema.js';

@Injectable()
export class LearningProgressRepository extends BaseMongoRepository<LearningProgressState, LearningProgressEntity> {
  constructor(@InjectModel(LearningProgressEntity.name) model: Model<LearningProgressEntity>) {
    super(model, (doc) => {
      const value = 'toObject' in doc ? doc.toObject() : doc;
      return {
        id: String(value._id),
        userId: String(value.userId),
        courseId: String(value.courseId),
        watchedMs: value.watchedMs,
        lastLessonId: value.lastLessonId ? String(value.lastLessonId) : null,
        lastMediaUrl: value.lastMediaUrl,
        lastPositionSeconds: value.lastPositionSeconds,
        sessionId: value.sessionId,
        sessionLessonId: value.sessionLessonId ? String(value.sessionLessonId) : null,
        sessionMediaUrl: value.sessionMediaUrl,
        sessionExpiresAt: value.sessionExpiresAt,
        lastHeartbeatAt: value.lastHeartbeatAt,
        sessionWatchedMs: value.sessionWatchedMs,
        lastSequence: value.lastSequence,
        sessionClosed: value.sessionClosed,
        revision: value.revision,
        updatedAt: value.updatedAt,
      };
    });
  }

  async ensureExists(userId: string, courseId: string): Promise<void> {
    try {
      await this.model.updateOne(
        { userId, courseId },
        { $setOnInsert: { userId, courseId, createdById: userId } },
        { upsert: true },
      ).exec();
    } catch (error) {
      // Concurrent first starts may race on the unique index; the winner created it.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  findForCourse(userId: string, courseId: string): Promise<LearningProgressState | null> {
    return this.findOne({ userId, courseId });
  }

  async findForCourses(userId: string, courseIds: string[]): Promise<LearningProgressState[]> {
    const docs = await this.model.find({ userId, courseId: { $in: courseIds }, deletedAt: null }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /** The lease, idempotency cursor, resume point and total commit in ONE atomic write. */
  async compareAndSet(state: LearningProgressState, changes: Partial<LearningProgressState>): Promise<boolean> {
    const result = await this.model.updateOne(
      { _id: state.id, userId: state.userId, courseId: state.courseId, revision: state.revision, deletedAt: null },
      { $set: { ...changes, updatedById: state.userId }, $inc: { revision: 1 } },
    ).exec();
    return result.modifiedCount === 1;
  }
}
