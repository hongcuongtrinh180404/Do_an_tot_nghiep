import { Model, ClientSession } from 'mongoose';
import { ICourseCategory } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';
export declare class CourseCategoryRepository extends BaseMongoRepository<ICourseCategory, CourseCategoryEntity> {
    constructor(courseCategoryModel: Model<CourseCategoryEntity>);
    findBySlug(slug: string, session?: ClientSession): Promise<ICourseCategory | null>;
    findBySlugIncludingDeleted(slug: string, session?: ClientSession): Promise<ICourseCategory | null>;
    findAllSorted(session?: ClientSession): Promise<ICourseCategory[]>;
}
