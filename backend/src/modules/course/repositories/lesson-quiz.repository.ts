import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ILessonQuiz, QuizQuestionTypeEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonQuizEntity } from '../schemas/lesson-quiz.schema.js';

@Injectable()
export class LessonQuizRepository extends BaseMongoRepository<
  ILessonQuiz,
  LessonQuizEntity
> {
  constructor(
    @InjectModel(LessonQuizEntity.name)
    lessonQuizModel: Model<LessonQuizEntity>,
  ) {
    super(lessonQuizModel, (doc) => {
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
        timestamp: (plain.timestamp ?? 0) as number,
        order: (plain.order ?? 1) as number,
        question: (plain.question ?? '') as string,
        questionType: (plain.questionType ?? QuizQuestionTypeEnum.SINGLE) as QuizQuestionTypeEnum,
        options: (plain.options ?? []) as ILessonQuiz['options'],
        explanation: (plain.explanation ?? null) as string | null,
        createdAt: plain.createdAt as Date | undefined,
        updatedAt: plain.updatedAt as Date | undefined,
      } as unknown as ILessonQuiz;
    });
  }

  async findByLessonId(
    lessonId: string,
    session?: ClientSession,
  ): Promise<ILessonQuiz[]> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const docs = await this.model
      .find({
        lessonId: lessonObjectId,
        deletedAt: null,
      } as Record<string, unknown>)
      .sort({ timestamp: 1, order: 1, _id: 1 })
      .session(session ?? null)
      .exec();

    return docs.map((d) => this.toDomain(d as unknown as LessonQuizEntity));
  }

  async findByLessonIdAndTimestamp(
    lessonId: string,
    timestamp: number,
    session?: ClientSession,
  ): Promise<ILessonQuiz[]> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const docs = await this.model
      .find({
        lessonId: lessonObjectId,
        timestamp,
        deletedAt: null,
      } as Record<string, unknown>)
      .sort({ order: 1, _id: 1 })
      .session(session ?? null)
      .exec();

    return docs.map((d) => this.toDomain(d as unknown as LessonQuizEntity));
  }

  async findByLessonIds(lessonIds: string[]): Promise<ILessonQuiz[]> {
    if (lessonIds.length === 0) return [];
    const docs = await this.model.find({
      lessonId: { $in: lessonIds.map((id) => new Types.ObjectId(id)) }, deletedAt: null,
    } as Record<string, unknown>).sort({ timestamp: 1, order: 1, _id: 1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Thay thế/đồng bộ toàn bộ danh sách câu hỏi tại một mốc thời gian cụ thể
   */
  async syncQuizzesAtTimestamp(
    lessonId: string,
    timestamp: number,
    quizzes: Array<{
      id?: string;
      order: number;
      question: string;
      questionType: QuizQuestionTypeEnum;
      options: ILessonQuiz['options'];
      explanation?: string | null;
    }>,
    session?: ClientSession,
  ): Promise<ILessonQuiz[]> {
    if (!session) {
      return this.withTransaction((transaction) => this.syncQuizzesAtTimestamp(lessonId, timestamp, quizzes, transaction));
    }
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const clusterFilter = { lessonId: lessonObjectId, timestamp: { $gte: Math.max(0, timestamp - 2), $lte: timestamp + 2 }, deletedAt: null };
    const existing = await this.model.find(clusterFilter as Record<string, unknown>).session(session).exec();
    const existingIds = new Set(existing.map((quiz) => String(quiz._id)));
    const retainedIds = quizzes.filter((quiz) => quiz.id).map((quiz) => quiz.id!);
    if (new Set(retainedIds).size !== retainedIds.length || retainedIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException('Câu hỏi cần đồng bộ không thuộc checkpoint này hoặc bị trùng ID');
    }

    // Preserve stable identities. Only removed questions are soft-deleted.
    await this.model
      .updateMany(
        {
          ...clusterFilter,
          _id: { $nin: retainedIds.map((id) => new Types.ObjectId(id)) },
        } as Record<string, unknown>,
        {
          $set: { deletedAt: new Date() },
        },
      )
      .session(session ?? null)
      .exec();

    if (quizzes.length === 0) {
      return [];
    }

    for (const quiz of quizzes.filter((item) => item.id)) {
      const { id, ...content } = quiz;
      await this.model.updateOne({ _id: id, lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>, {
        $set: { ...content, timestamp },
      }, { session }).exec();
    }

    const documentsToInsert = quizzes.filter((quiz) => !quiz.id).map((q) => ({
      lessonId: lessonObjectId,
      timestamp,
      order: q.order,
      question: q.question,
      questionType: q.questionType,
      options: q.options,
      explanation: q.explanation || null,
      deletedAt: null,
    }));

    if (documentsToInsert.length > 0) await this.model.insertMany(documentsToInsert, { session });
    return this.findByLessonIdAndTimestamp(lessonId, timestamp, session);
  }

  /**
   * Soft-delete tất cả câu hỏi tại cụm mốc thời gian của bài học (dung sai rangeSeconds, mặc định +- 2s)
   */
  async deleteQuizzesAtTimestampRange(
    lessonId: string,
    timestamp: number,
    rangeSeconds: number = 2,
    session?: ClientSession,
  ): Promise<number> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const minTs = Math.max(0, timestamp - rangeSeconds);
    const maxTs = timestamp + rangeSeconds;

    const res = await this.model
      .updateMany(
        {
          lessonId: lessonObjectId,
          timestamp: { $gte: minTs, $lte: maxTs },
          deletedAt: null,
        } as Record<string, unknown>,
        {
          $set: { deletedAt: new Date() },
        },
      )
      .session(session ?? null)
      .exec();

    return res.modifiedCount || 0;
  }

  /**
   * Thay thế toàn bộ danh sách câu hỏi của bài học (thường dùng khi Apply từ bản nháp)
   */
  async replaceAllQuizzesForLesson(
    lessonId: string,
    quizzes: Array<{
      timestamp: number;
      order: number;
      question: string;
      questionType: QuizQuestionTypeEnum;
      options: ILessonQuiz['options'];
      explanation?: string | null;
    }>,
    session?: ClientSession,
  ): Promise<ILessonQuiz[]> {
    if (!session) {
      return this.withTransaction((transaction) => this.replaceAllQuizzesForLesson(lessonId, quizzes, transaction));
    }
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    // 1. Soft-delete tất cả câu hỏi cũ của bài học
    await this.model
      .updateMany(
        {
          lessonId: lessonObjectId,
          deletedAt: null,
        } as Record<string, unknown>,
        {
          $set: { deletedAt: new Date() },
        },
      )
      .session(session ?? null)
      .exec();

    if (quizzes.length === 0) {
      return [];
    }

    // 2. Chèn danh sách câu hỏi mới
    const documentsToInsert = quizzes.map((q) => ({
      lessonId: lessonObjectId,
      timestamp: q.timestamp,
      order: q.order,
      question: q.question,
      questionType: q.questionType,
      options: q.options,
      explanation: q.explanation || null,
      deletedAt: null,
    }));

    const insertedDocs = await this.model.insertMany(documentsToInsert, {
      session: session ?? undefined,
    });

    return insertedDocs.map((d) => this.toDomain(d as unknown as LessonQuizEntity));
  }

  /**
   * Di chuyển hoặc gộp cụm câu hỏi từ sourceTimestamp sang targetTimestamp
   */
  async moveOrMergeCluster(
    lessonId: string,
    sourceTimestamp: number,
    targetTimestamp: number,
    rangeSeconds: number = 2,
    session?: ClientSession,
  ): Promise<ILessonQuiz[]> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const sourceMin = Math.max(0, sourceTimestamp - rangeSeconds);
    const sourceMax = sourceTimestamp + rangeSeconds;

    // 1. Tìm các câu hỏi tại cụm nguồn
    const sourceDocs = await this.model
      .find({
        lessonId: lessonObjectId,
        timestamp: { $gte: sourceMin, $lte: sourceMax },
        deletedAt: null,
      } as Record<string, unknown>)
      .sort({ order: 1 })
      .session(session ?? null)
      .exec();

    if (sourceDocs.length === 0) {
      return this.findByLessonId(lessonId, session);
    }

    const sourceIds = sourceDocs.map((doc) => doc._id);

    // 2. Tìm các câu hỏi tại cụm đích (loại trừ các câu hỏi thuộc cụm nguồn)
    const targetMin = Math.max(0, targetTimestamp - rangeSeconds);
    const targetMax = targetTimestamp + rangeSeconds;

    const targetDocs = await this.model
      .find({
        lessonId: lessonObjectId,
        _id: { $nin: sourceIds },
        timestamp: { $gte: targetMin, $lte: targetMax },
        deletedAt: null,
      } as Record<string, unknown>)
      .sort({ order: 1 })
      .session(session ?? null)
      .exec();

    const isMerge = targetDocs.length > 0;
    const finalTargetTimestamp = isMerge
      ? targetDocs[0].timestamp
      : Math.round(targetTimestamp);

    // 3. Cập nhật câu hỏi nguồn
    if (isMerge) {
      const maxTargetOrder = targetDocs.reduce(
        (max, doc) => Math.max(max, doc.order || 0),
        0,
      );

      for (let i = 0; i < sourceDocs.length; i++) {
        await this.model
          .updateOne(
            { _id: sourceDocs[i]._id },
            {
              $set: {
                timestamp: finalTargetTimestamp,
                order: maxTargetOrder + i + 1,
              },
            },
          )
          .session(session ?? null)
          .exec();
      }
    } else {
      for (let i = 0; i < sourceDocs.length; i++) {
        await this.model
          .updateOne(
            { _id: sourceDocs[i]._id },
            {
              $set: {
                timestamp: finalTargetTimestamp,
                order: i + 1,
              },
            },
          )
          .session(session ?? null)
          .exec();
      }
    }

    return this.findByLessonId(lessonId, session);
  }
}
