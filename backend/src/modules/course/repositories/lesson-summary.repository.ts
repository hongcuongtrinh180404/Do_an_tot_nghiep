import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import type { ILessonSummary, ILessonSummaryData } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonSummaryEntity } from '../schemas/lesson-summary.schema.js';

@Injectable()
export class LessonSummaryRepository extends BaseMongoRepository<ILessonSummary, LessonSummaryEntity> {
  constructor(
    @InjectModel(LessonSummaryEntity.name)
    lessonSummaryModel: Model<LessonSummaryEntity>,
  ) {
    super(lessonSummaryModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawLessonId = plain.lessonId;
      const lessonId =
        typeof rawLessonId === 'string'
          ? rawLessonId
          : (rawLessonId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: (id ?? '') as string,
        lessonId: (lessonId ?? '') as string,
        summary: plain.summary as ILessonSummaryData,
        draftSummary: plain.draftSummary as ILessonSummaryData | null,
      } as unknown as ILessonSummary;
    });
  }

  async findByLessonId(
    lessonId: string,
    session?: ClientSession,
  ): Promise<ILessonSummary | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOne({
        lessonId: lessonObjectId,
        deletedAt: null,
      } as Record<string, unknown>)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc as unknown as LessonSummaryEntity) : null;
  }

  async saveDraftByLessonId(
    lessonId: string,
    draftData: ILessonSummaryData,
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonSummary> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        {
          $set: {
            draftSummary: draftData,
            updatedById: userId ?? 'SYSTEM',
          },
          $setOnInsert: {
            lessonId: lessonObjectId,
            summary: draftData,
            createdById: userId ?? 'SYSTEM',
            deletedAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          session: session ?? null,
        },
      )
      .exec();

    return this.toDomain(doc as unknown as LessonSummaryEntity);
  }

  async applyDraftByLessonId(
    lessonId: string,
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonSummary | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const existing = await this.model
      .findOne({ lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>)
      .session(session ?? null)
      .exec();

    const plain = existing as unknown as { draftSummary?: ILessonSummaryData | null };
    if (!plain || !plain.draftSummary) {
      return null;
    }

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        {
          $set: {
            summary: plain.draftSummary,
            draftSummary: null,
            updatedById: userId ?? 'SYSTEM',
          },
        },
        {
          new: true,
          session: session ?? null,
        },
      )
      .exec();

    return doc ? this.toDomain(doc as unknown as LessonSummaryEntity) : null;
  }

  async upsertOfficialByLessonId(
    lessonId: string,
    summaryData: ILessonSummaryData,
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonSummary> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        {
          $set: {
            summary: summaryData,
            draftSummary: null,
            updatedById: userId ?? 'SYSTEM',
          },
          $setOnInsert: {
            lessonId: lessonObjectId,
            createdById: userId ?? 'SYSTEM',
            deletedAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          session: session ?? null,
        },
      )
      .exec();

    return this.toDomain(doc as unknown as LessonSummaryEntity);
  }
}
