import { type ICourse, type ICourseApprovalChecklist, RoleEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { CourseService } from './course.service.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
export declare class CourseApprovalService {
    private readonly courseService;
    private readonly courseRepository;
    private readonly categoryRepository;
    private readonly sectionRepository;
    private readonly lessonRepository;
    private readonly lessonQuizRepository;
    constructor(courseService: CourseService, courseRepository: CourseRepository, categoryRepository: CourseCategoryRepository, sectionRepository: SectionRepository, lessonRepository: LessonRepository, lessonQuizRepository: LessonQuizRepository);
    private checkCourse;
    getChecklist(courseId: string, userId: string, role: RoleEnum): Promise<ICourseApprovalChecklist>;
    requestApproval(courseId: string, userId: string, role: RoleEnum): Promise<ICourse>;
    withdrawApproval(courseId: string, userId: string, role: RoleEnum): Promise<ICourse>;
}
