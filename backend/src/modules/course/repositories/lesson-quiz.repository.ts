import { Injectable } from '@nestjs/common';
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
      .sort({ timestamp: 1, order: 1 })
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
      .sort({ order: 1 })
      .session(session ?? null)
      .exec();

    return docs.map((d) => this.toDomain(d as unknown as LessonQuizEntity));
  }

  /**
   * Thay thế/đồng bộ toàn bộ danh sách câu hỏi tại một mốc thời gian cụ thể
   */
  async syncQuizzesAtTimestamp(
    lessonId: string,
    timestamp: number,
    quizzes: Array<{
      order: number;
      question: string;
      questionType: QuizQuestionTypeEnum;
      options: ILessonQuiz['options'];
      explanation?: string | null;
    }>,
    session?: ClientSession,
  ): Promise<ILessonQuiz[]> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    // 1. Soft-delete các câu hỏi cũ tại cùng mốc thời gian
    await this.model
      .updateMany(
        {
          lessonId: lessonObjectId,
          timestamp,
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
      timestamp,
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
}

