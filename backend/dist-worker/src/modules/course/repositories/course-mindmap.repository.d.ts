import { Model, ClientSession } from 'mongoose';
import { ICourseMindmap } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseMindmapEntity } from '../schemas/course-mindmap.schema.js';
export declare class CourseMindmapRepository extends BaseMongoRepository<ICourseMindmap, CourseMindmapEntity> {
    constructor(courseMindmapModel: Model<CourseMindmapEntity>);
    findByCourseId(courseId: string, session?: ClientSession): Promise<ICourseMindmap | null>;
    upsertByCourseId(courseId: string, mindmapData: Record<string, unknown>, userId?: string, session?: ClientSession): Promise<ICourseMindmap>;
    softDeleteByCourseId(courseId: string, userId?: string, session?: ClientSession): Promise<number>;
}
