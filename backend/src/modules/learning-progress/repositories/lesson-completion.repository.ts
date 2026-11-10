import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ILessonQuiz, ILessonQuizAnswer } from 'share-lib';
import { LessonQuizAnswerEntity, LessonVideoCompletionEntity } from '../schemas/lesson-completion.schema.js';

@Injectable()
export class LessonCompletionRepository {
  constructor(
    @InjectModel(LessonQuizAnswerEntity.name) private readonly answers: Model<LessonQuizAnswerEntity>,
    @InjectModel(LessonVideoCompletionEntity.name) private readonly videos: Model<LessonVideoCompletionEntity>,
  ) {}

  async findAnswers(userId: string, lessonId: string): Promise<ILessonQuizAnswer[]> {
    const docs = await this.answers.find({ userId, lessonId, deletedAt: null }).lean().exec();
    return docs.map((doc) => ({
      quizId: String(doc.quizId), quizRevision: doc.quizRevision,
      selectedOptionIds: doc.selectedOptionIds, isCorrect: doc.isCorrect,
      correctOptionIds: doc.correctOptionIds, submittedAt: doc.submittedAt,
    }));
  }

  async findAnswersForCourse(userId: string, courseId: string): Promise<Array<ILessonQuizAnswer & { lessonId: string }>> {
    const docs = await this.answers.find({ userId, courseId, deletedAt: null }).lean().exec();
    return docs.map((doc) => ({
      lessonId: String(doc.lessonId), quizId: String(doc.quizId), quizRevision: doc.quizRevision,
      selectedOptionIds: doc.selectedOptionIds, isCorrect: doc.isCorrect,
      correctOptionIds: doc.correctOptionIds, submittedAt: doc.submittedAt,
    }));
  }

  async findVideoCompletionsForCourse(userId: string, courseId: string): Promise<Array<{ lessonId: string; mediaVersion: string }>> {
    const docs = await this.videos.find({ userId, courseId, deletedAt: null }).select({ lessonId: 1, mediaVersion: 1 }).lean().exec();
    return docs.map((doc) => ({ lessonId: String(doc.lessonId), mediaVersion: doc.mediaVersion }));
  }

  async saveAnswer(userId: string, courseId: string, lessonId: string, answer: ILessonQuizAnswer, quiz: ILessonQuiz): Promise<void> {
    const filter = { userId, lessonId, quizId: answer.quizId, quizRevision: answer.quizRevision };
    try {
      // First successful submission wins, even across tabs and retries with different selections.
      await this.answers.updateOne(filter, { $setOnInsert: {
        ...filter, courseId, selectedOptionIds: answer.selectedOptionIds,
        isCorrect: answer.isCorrect, correctOptionIds: answer.correctOptionIds,
        submittedAt: answer.submittedAt, quizSnapshot: quiz, createdById: userId,
      } }, { upsert: true }).exec();
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  async hasVideoEnded(userId: string, lessonId: string, mediaVersion: string): Promise<boolean> {
    return Boolean(await this.videos.exists({ userId, lessonId, mediaVersion, deletedAt: null }));
  }

  async saveVideoEnded(userId: string, courseId: string, lessonId: string, mediaVersion: string): Promise<void> {
    const filter = { userId, lessonId, mediaVersion };
    try {
      await this.videos.updateOne(filter, { $setOnInsert: {
        ...filter, courseId, endedAt: new Date(), createdById: userId,
      } }, { upsert: true }).exec();
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
}
