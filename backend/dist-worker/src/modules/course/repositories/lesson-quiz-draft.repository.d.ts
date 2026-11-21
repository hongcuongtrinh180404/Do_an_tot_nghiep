import { Model, ClientSession } from 'mongoose';
import type { IGeneratedQuizItem, ILessonQuizDraft } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonQuizDraftEntity } from '../schemas/lesson-quiz-draft.schema.js';
export declare class LessonQuizDraftRepository extends BaseMongoRepository<ILessonQuizDraft, LessonQuizDraftEntity> {
    constructor(lessonQuizDraftModel: Model<LessonQuizDraftEntity>);
    findByLessonId(lessonId: string, session?: ClientSession): Promise<ILessonQuizDraft | null>;
    saveDraftByLessonId(lessonId: string, quizzes: IGeneratedQuizItem[], userId?: string, session?: ClientSession): Promise<ILessonQuizDraft>;
    clearDraftByLessonId(lessonId: string, session?: ClientSession): Promise<boolean>;
}
