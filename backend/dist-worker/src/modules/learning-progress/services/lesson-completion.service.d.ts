import { type ILessonCompletion, type ILessonCompletionSummary } from 'share-lib';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonCompletionRepository } from '../repositories/lesson-completion.repository.js';
import { CompleteLessonVideoDto, SubmitLessonQuizAnswerDto } from '../dto/lesson-completion.dto.js';
import type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';
export declare class LessonCompletionService {
    private readonly repository;
    private readonly enrollments;
    private readonly courses;
    private readonly sections;
    private readonly lessons;
    private readonly quizzes;
    constructor(repository: LessonCompletionRepository, enrollments: EnrollmentRepository, courses: CourseRepository, sections: SectionRepository, lessons: LessonRepository, quizzes: LessonQuizRepository);
    private requireEnrollment;
    private requireLesson;
    private mediaVersion;
    private summarize;
    private buildState;
    getLesson(userId: string, courseId: string, lessonId: string): Promise<ILessonCompletion>;
    getLessons(userId: string, courseId: string): Promise<ILessonCompletionSummary[]>;
    getSummariesForCourses(userId: string, stats: CourseVideoStats[], maxTimeMS?: number): Promise<Map<string, ILessonCompletionSummary[]>>;
    submitAnswer(userId: string, courseId: string, lessonId: string, dto: SubmitLessonQuizAnswerDto): Promise<ILessonCompletion>;
    videoEnded(userId: string, courseId: string, lessonId: string, dto: CompleteLessonVideoDto): Promise<ILessonCompletion>;
}
