import { Model, ClientSession } from 'mongoose';
import { ILessonQuiz, QuizQuestionTypeEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonQuizEntity } from '../schemas/lesson-quiz.schema.js';
export declare class LessonQuizRepository extends BaseMongoRepository<ILessonQuiz, LessonQuizEntity> {
    constructor(lessonQuizModel: Model<LessonQuizEntity>);
    findByLessonId(lessonId: string, session?: ClientSession): Promise<ILessonQuiz[]>;
    findByLessonIdAndTimestamp(lessonId: string, timestamp: number | null, session?: ClientSession): Promise<ILessonQuiz[]>;
    hardDelete(id: string, session?: ClientSession): Promise<boolean>;
    findByLessonIds(lessonIds: string[], maxTimeMS?: number): Promise<ILessonQuiz[]>;
    syncQuizzesAtTimestamp(lessonId: string, timestamp: number, quizzes: Array<{
        id?: string;
        order: number;
        timestamp?: number | null;
        question: string;
        questionType: QuizQuestionTypeEnum;
        options: ILessonQuiz['options'];
        explanation?: string | null;
        explanationTimestamp?: number | null;
    }>, session?: ClientSession): Promise<ILessonQuiz[]>;
    deleteQuizzesAtTimestampRange(lessonId: string, timestamp: number, rangeSeconds?: number, session?: ClientSession): Promise<number>;
    replaceAllQuizzesForLesson(lessonId: string, quizzes: Array<{
        timestamp: number | null;
        order: number;
        question: string;
        questionType: QuizQuestionTypeEnum;
        options: ILessonQuiz['options'];
        explanation?: string | null;
        explanationTimestamp?: number | null;
    }>, session?: ClientSession): Promise<ILessonQuiz[]>;
    moveOrMergeCluster(lessonId: string, sourceTimestamp: number, targetTimestamp: number, rangeSeconds?: number, session?: ClientSession): Promise<ILessonQuiz[]>;
}
