import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import type { IGeneratedQuizItem, ILessonQuizDraft } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonQuizDraftEntity } from '../schemas/lesson-quiz-draft.schema.js';

@Injectable()
export class LessonQuizDraftRepository extends BaseMongoRepository<ILessonQuizDraft, LessonQuizDraftEntity> {
  constructor(
    @InjectModel(LessonQuizDraftEntity.name)
    lessonQuizDraftModel: Model<LessonQuizDraftEntity>,
  ) {
    super(lessonQuizDraftModel, (doc) => {
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
        quizzes: (plain.quizzes ?? []) as IGeneratedQuizItem[],
      } as unknown as ILessonQuizDraft;
    });
  }

  async findByLessonId(
    lessonId: string,
    session?: ClientSession,
  ): Promise<ILessonQuizDraft | null> {
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

    return doc ? this.toDomain(doc as unknown as LessonQuizDraftEntity) : null;
  }

  async saveDraftByLessonId(
    lessonId: string,
    quizzes: IGeneratedQuizItem[],
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonQuizDraft> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        {
          $set: {
            quizzes,
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

    return this.toDomain(doc as unknown as LessonQuizDraftEntity);
  }

  async clearDraftByLessonId(
    lessonId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const res = await this.model
      .deleteMany({ lessonId: lessonObjectId } as Record<string, unknown>)
      .session(session ?? null)
      .exec();

    return (res.deletedCount ?? 0) > 0;
  }
}
