import { Model, ClientSession } from 'mongoose';
import type { ILessonMindmap, ILessonMindmapData } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonMindmapEntity } from '../schemas/lesson-mindmap.schema.js';
export declare class LessonMindmapRepository extends BaseMongoRepository<ILessonMindmap, LessonMindmapEntity> {
    constructor(lessonMindmapModel: Model<LessonMindmapEntity>);
    findByLessonId(lessonId: string, session?: ClientSession): Promise<ILessonMindmap | null>;
    saveDraftByLessonId(lessonId: string, draftData: ILessonMindmapData, userId?: string, session?: ClientSession): Promise<ILessonMindmap>;
    applyDraftByLessonId(lessonId: string, userId?: string, session?: ClientSession): Promise<ILessonMindmap | null>;
    upsertOfficialByLessonId(lessonId: string, mindmapData: ILessonMindmapData, userId?: string, session?: ClientSession): Promise<ILessonMindmap>;
}
