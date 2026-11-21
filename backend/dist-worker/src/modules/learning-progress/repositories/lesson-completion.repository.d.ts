import { Model } from 'mongoose';
import type { ILessonQuiz, ILessonQuizAnswer } from 'share-lib';
import { LessonQuizAnswerEntity, LessonVideoCompletionEntity } from '../schemas/lesson-completion.schema.js';
export declare class LessonCompletionRepository {
    private readonly answers;
    private readonly videos;
    constructor(answers: Model<LessonQuizAnswerEntity>, videos: Model<LessonVideoCompletionEntity>);
    findAnswers(userId: string, lessonId: string): Promise<ILessonQuizAnswer[]>;
    findAnswersForCourse(userId: string, courseId: string): Promise<Array<ILessonQuizAnswer & {
        lessonId: string;
    }>>;
    findVideoCompletionsForCourse(userId: string, courseId: string): Promise<Array<{
        lessonId: string;
        mediaVersion: string;
    }>>;
    findAnswersForCourses(userId: string, courseIds: string[], maxTimeMS?: number): Promise<Array<ILessonQuizAnswer & {
        courseId: string;
        lessonId: string;
    }>>;
    findVideoCompletionsForCourses(userId: string, courseIds: string[], maxTimeMS?: number): Promise<Array<{
        courseId: string;
        lessonId: string;
        mediaVersion: string;
    }>>;
    saveAnswer(userId: string, courseId: string, lessonId: string, answer: ILessonQuizAnswer, quiz: ILessonQuiz): Promise<void>;
    hasVideoEnded(userId: string, lessonId: string, mediaVersion: string): Promise<boolean>;
    saveVideoEnded(userId: string, courseId: string, lessonId: string, mediaVersion: string): Promise<void>;
}
