import { IUserProfile } from 'share-lib';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
export interface VerifyLessonAccessOptions {
    allowPendingApproval?: boolean;
}
export declare class JobManagementPolicy {
    private readonly lessonRepository;
    private readonly sectionRepository;
    private readonly courseRepository;
    constructor(lessonRepository: LessonRepository, sectionRepository: SectionRepository, courseRepository: CourseRepository);
    verifyLessonAccess(lessonId: string, user?: Pick<IUserProfile, 'id' | 'role'>, options?: VerifyLessonAccessOptions): Promise<{
        lesson: any;
        section: any;
        course: any;
    }>;
}
