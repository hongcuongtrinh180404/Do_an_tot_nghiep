import { Model, ClientSession } from 'mongoose';
import type { ILessonSummary, ILessonSummaryData } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonSummaryEntity } from '../schemas/lesson-summary.schema.js';
export declare class LessonSummaryRepository extends BaseMongoRepository<ILessonSummary, LessonSummaryEntity> {
    constructor(lessonSummaryModel: Model<LessonSummaryEntity>);
    findByLessonId(lessonId: string, session?: ClientSession): Promise<ILessonSummary | null>;
    saveDraftByLessonId(lessonId: string, draftData: ILessonSummaryData, userId?: string, session?: ClientSession): Promise<ILessonSummary>;
    applyDraftByLessonId(lessonId: string, userId?: string, session?: ClientSession): Promise<ILessonSummary | null>;
    upsertOfficialByLessonId(lessonId: string, summaryData: ILessonSummaryData, userId?: string, session?: ClientSession): Promise<ILessonSummary>;
}
