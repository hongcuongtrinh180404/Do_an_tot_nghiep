import { Model, ClientSession } from 'mongoose';
import { ILesson, ILessonMaterial } from 'share-lib';
import type { CourseVideoStats } from '../interfaces/course-video-stats.interface.js';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonEntity } from '../schemas/lesson.schema.js';
export declare class LessonRepository extends BaseMongoRepository<ILesson, LessonEntity> {
    constructor(lessonModel: Model<LessonEntity>);
    findBySectionId(sectionId: string, session?: ClientSession): Promise<ILesson[]>;
    findBySectionIds(sectionIds: string[]): Promise<ILesson[]>;
    findByMediaUrl(url: string): Promise<ILesson | null>;
    getCourseVideoStats(courseIds: string[], maxTimeMS?: number): Promise<CourseVideoStats[]>;
    softDeleteBySectionId(sectionId: string, userId?: string, session?: ClientSession): Promise<number>;
    softDeleteBySectionIds(sectionIds: string[], userId?: string, session?: ClientSession): Promise<number>;
    addMaterial(lessonId: string, material: Omit<ILessonMaterial, 'id'>, session?: ClientSession): Promise<ILesson | null>;
    deleteMaterial(lessonId: string, materialId: string, session?: ClientSession): Promise<ILesson | null>;
    reorderAfterDelete(sectionId: string, deletedOrder: number, session?: ClientSession): Promise<number>;
}
