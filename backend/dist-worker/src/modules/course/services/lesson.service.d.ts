import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ILesson, ILessonContent, RoleEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { StorageService } from '../../storage/index.js';
import { LessonTranscriptService } from './lesson-transcript.service.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
export interface CreateLessonInput {
    title: string;
    order: number;
    content: ILessonContent;
    isPreview?: boolean;
    userId?: string;
}
export interface UpdateLessonInput {
    title?: string;
    order?: number;
    isPreview?: boolean;
}
export declare class LessonService extends BaseService<ILesson, string> {
    protected readonly lessonRepository: LessonRepository;
    protected readonly sectionRepository: SectionRepository;
    protected readonly enrollmentRepository: EnrollmentRepository;
    protected readonly storageService?: StorageService | undefined;
    protected readonly courseRepository?: CourseRepository | undefined;
    protected readonly lessonTranscriptService?: LessonTranscriptService | undefined;
    constructor(lessonRepository: LessonRepository, sectionRepository: SectionRepository, cls: ClsService, enrollmentRepository: EnrollmentRepository, storageService?: StorageService | undefined, courseRepository?: CourseRepository | undefined, lessonTranscriptService?: LessonTranscriptService | undefined);
    createLesson(sectionId: string, input: CreateLessonInput, session?: ClientSession): Promise<ILesson>;
    updateLesson(lessonId: string, input: UpdateLessonInput, userId?: string, userRole?: RoleEnum, session?: ClientSession): Promise<ILesson>;
    getLessonsBySectionId(sectionId: string, session?: ClientSession): Promise<ILesson[]>;
    getLessonById(id: string, session?: ClientSession): Promise<ILesson>;
    getLessonForUser(id: string, userId?: string, userRole?: RoleEnum, session?: ClientSession): Promise<ILesson>;
    getAccessibleLesson(id: string, userId?: string, userRole?: RoleEnum, session?: ClientSession): Promise<ILesson>;
    getAuthorizedStreamUrl(keyOrUrl: string, userId?: string, userRole?: RoleEnum): Promise<string>;
    addMaterial(lessonId: string, file: Express.Multer.File, title?: string, userId?: string, userRole?: RoleEnum, session?: ClientSession): Promise<ILesson>;
    deleteMaterial(lessonId: string, materialId: string, userId?: string, userRole?: RoleEnum, session?: ClientSession): Promise<ILesson>;
    deleteLesson(lessonId: string, userId?: string, userRole?: RoleEnum): Promise<boolean>;
}
