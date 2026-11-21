import { Model, ClientSession } from 'mongoose';
import { ISection } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { SectionEntity } from '../schemas/section.schema.js';
export declare class SectionRepository extends BaseMongoRepository<ISection, SectionEntity> {
    constructor(sectionModel: Model<SectionEntity>);
    findByCourseId(courseId: string, session?: ClientSession): Promise<ISection[]>;
    reorderSections(courseId: string, sectionIds: string[], userId?: string, session?: ClientSession): Promise<ISection[]>;
    shiftOrdersAfterDelete(courseId: string, fromOrder: number, userId?: string, session?: ClientSession): Promise<number>;
    softDeleteByCourseId(courseId: string, userId?: string, session?: ClientSession): Promise<number>;
}
