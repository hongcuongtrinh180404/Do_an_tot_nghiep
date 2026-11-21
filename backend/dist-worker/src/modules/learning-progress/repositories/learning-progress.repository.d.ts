import { Model } from 'mongoose';
import { BaseMongoRepository } from '../../base/index.js';
import { LearningProgressEntity, type LearningProgressState } from '../schemas/learning-progress.schema.js';
export declare class LearningProgressRepository extends BaseMongoRepository<LearningProgressState, LearningProgressEntity> {
    constructor(model: Model<LearningProgressEntity>);
    ensureExists(userId: string, courseId: string): Promise<void>;
    findForCourse(userId: string, courseId: string): Promise<LearningProgressState | null>;
    findForCourses(userId: string, courseIds: string[], maxTimeMS?: number): Promise<LearningProgressState[]>;
    compareAndSet(state: LearningProgressState, changes: Partial<LearningProgressState>): Promise<boolean>;
}
