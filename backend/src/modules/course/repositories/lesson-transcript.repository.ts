import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ILessonTranscript, LessonTranscriptionStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonTranscriptEntity } from '../schemas/lesson-transcript.schema.js';

@Injectable()
export class LessonTranscriptRepository extends BaseMongoRepository<
  ILessonTranscript,
  LessonTranscriptEntity
> {
  constructor(
    @InjectModel(LessonTranscriptEntity.name)
    lessonTranscriptModel: Model<LessonTranscriptEntity>,
  ) {
    super(lessonTranscriptModel, (doc) => {
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
        id: id as string,
        lessonId: (lessonId ?? '') as string,
        rawTranscript: (plain.rawTranscript ?? '') as string,
        sentences: (plain.sentences ?? []) as ILessonTranscript['sentences'],
        durationSeconds: (plain.durationSeconds ?? 0) as number,
        languageCode: (plain.languageCode ?? 'vi') as string,
        status: (plain.status ?? LessonTranscriptionStatusEnum.IDLE) as LessonTranscriptionStatusEnum,
        externalTranscriptId: (plain.externalTranscriptId ?? null) as string | null,
        failureReason: (plain.failureReason ?? null) as string | null,
      } as unknown as ILessonTranscript;
    });
  }

  async findByLessonId(
    lessonId: string,
    session?: ClientSession,
  ): Promise<ILessonTranscript | null> {
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

    return doc ? this.toDomain(doc as unknown as LessonTranscriptEntity) : null;
  }

  async upsertByLessonId(
    lessonId: string,
    payload: Partial<ILessonTranscript>,
    session?: ClientSession,
  ): Promise<ILessonTranscript> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        {
          lessonId: lessonObjectId,
          deletedAt: null,
        } as Record<string, unknown>,
        {
          $set: {
            ...payload,
            lessonId: lessonObjectId,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          session: session ?? null,
        },
      )
      .exec();

    if (!doc) {
      throw new Error(`Failed to upsert lesson transcript for lesson ID: ${lessonId}`);
    }

    return this.toDomain(doc as unknown as LessonTranscriptEntity);
  }

  async updateStatusByLessonId(
    lessonId: string,
    status: LessonTranscriptionStatusEnum,
    failureReason?: string | null,
    session?: ClientSession,
  ): Promise<ILessonTranscript | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        {
          lessonId: lessonObjectId,
          deletedAt: null,
        } as Record<string, unknown>,
        {
          $set: {
            status,
            failureReason: failureReason ?? null,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          session: session ?? null,
        },
      )
      .exec();

    return doc ? this.toDomain(doc as unknown as LessonTranscriptEntity) : null;
  }
}
