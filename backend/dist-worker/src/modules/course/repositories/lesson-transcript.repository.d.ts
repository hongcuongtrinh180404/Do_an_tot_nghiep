import { Model, ClientSession } from 'mongoose';
import { ILessonTranscript, LessonTranscriptionStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonTranscriptEntity } from '../schemas/lesson-transcript.schema.js';
export declare class LessonTranscriptRepository extends BaseMongoRepository<ILessonTranscript, LessonTranscriptEntity> {
    constructor(lessonTranscriptModel: Model<LessonTranscriptEntity>);
    findByLessonId(lessonId: string, session?: ClientSession): Promise<ILessonTranscript | null>;
    upsertByLessonId(lessonId: string, payload: Partial<ILessonTranscript>, session?: ClientSession): Promise<ILessonTranscript>;
    updateStatusByLessonId(lessonId: string, status: LessonTranscriptionStatusEnum, failureReason?: string | null, session?: ClientSession): Promise<ILessonTranscript | null>;
}
