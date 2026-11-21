import { type ICourseLearningProgress, type IPlaybackSessionResponse } from 'share-lib';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LearningProgressRepository } from '../repositories/learning-progress.repository.js';
import { PlaybackHeartbeatDto, StartPlaybackSessionDto } from '../dto/playback-session.dto.js';
import { LessonCompletionService } from './lesson-completion.service.js';
export declare class LearningProgressService {
    private readonly progressRepository;
    private readonly enrollmentRepository;
    private readonly courseRepository;
    private readonly lessonRepository;
    private readonly lessonCompletion;
    constructor(progressRepository: LearningProgressRepository, enrollmentRepository: EnrollmentRepository, courseRepository: CourseRepository, lessonRepository: LessonRepository, lessonCompletion: LessonCompletionService);
    private isEnrolled;
    private requireEnrollment;
    getProgress(userId: string, courseId: string): Promise<ICourseLearningProgress | null>;
    getMyProgress(userId: string): Promise<ICourseLearningProgress[]>;
    getProgressForCourses(userId: string, courseIds: string[], maxTimeMS?: number): Promise<ICourseLearningProgress[]>;
    private summarizeCourse;
    startSession(userId: string, courseId: string, dto: StartPlaybackSessionDto): Promise<IPlaybackSessionResponse>;
    heartbeat(userId: string, courseId: string, dto: PlaybackHeartbeatDto, end?: boolean): Promise<IPlaybackSessionResponse>;
}
