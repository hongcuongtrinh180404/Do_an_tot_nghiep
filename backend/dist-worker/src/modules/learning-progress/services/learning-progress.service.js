var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PLAYBACK_LEASE_MS } from 'share-lib';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LearningProgressRepository } from '../repositories/learning-progress.repository.js';
import { summarizeProgress } from '../utils/learning-progress.util.js';
import { LessonCompletionService } from './lesson-completion.service.js';
let LearningProgressService = class LearningProgressService {
    progressRepository;
    enrollmentRepository;
    courseRepository;
    lessonRepository;
    lessonCompletion;
    constructor(progressRepository, enrollmentRepository, courseRepository, lessonRepository, lessonCompletion) {
        this.progressRepository = progressRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
        this.lessonCompletion = lessonCompletion;
    }
    async isEnrolled(userId, courseId) {
        const [course, enrollment] = await Promise.all([
            this.courseRepository.findById(courseId),
            this.enrollmentRepository.findByUserAndCourse(userId, courseId),
        ]);
        if (!course || course.deletedAt)
            throw new NotFoundException('Không tìm thấy khóa học');
        return Boolean(enrollment && !enrollment.deletedAt);
    }
    async requireEnrollment(userId, courseId) {
        if (!await this.isEnrolled(userId, courseId)) {
            throw new ForbiddenException('Bạn cần đăng ký khóa học để ghi nhận tiến độ');
        }
    }
    async getProgress(userId, courseId) {
        if (!await this.isEnrolled(userId, courseId))
            return null;
        return (await this.getProgressForCourses(userId, [courseId]))[0];
    }
    async getMyProgress(userId) {
        const enrollments = await this.enrollmentRepository.findUserEnrollments(userId);
        const courseIds = [...new Set(enrollments.filter((item) => item.course && !item.course.deletedAt).map((item) => item.courseId))];
        return this.getProgressForCourses(userId, courseIds);
    }
    async getProgressForCourses(userId, courseIds, maxTimeMS) {
        if (courseIds.length === 0)
            return [];
        const [states, stats] = await Promise.all([
            this.progressRepository.findForCourses(userId, courseIds, ...(maxTimeMS ? [maxTimeMS] : [])),
            this.lessonRepository.getCourseVideoStats(courseIds, ...(maxTimeMS ? [maxTimeMS] : [])),
        ]);
        const completions = await this.lessonCompletion.getSummariesForCourses(userId, stats, ...(maxTimeMS ? [maxTimeMS] : []));
        const stateMap = new Map(states.map((state) => [state.courseId, state]));
        const statsMap = new Map(stats.map((item) => [item.courseId, item]));
        return courseIds.map((id) => summarizeProgress(id, stateMap.get(id) ?? null, statsMap.get(id), completions.get(id)));
    }
    async summarizeCourse(userId, courseId, state, stats) {
        const completions = await this.lessonCompletion.getSummariesForCourses(userId, stats ? [stats] : []);
        return summarizeProgress(courseId, state, stats, completions.get(courseId));
    }
    async startSession(userId, courseId, dto) {
        await this.requireEnrollment(userId, courseId);
        const [stats] = await this.lessonRepository.getCourseVideoStats([courseId]);
        const video = stats?.videos.find((item) => item.lessonId === dto.lessonId);
        if (!video?.url)
            throw new BadRequestException('Bài học không phải video đang có trong khóa học');
        await this.progressRepository.ensureExists(userId, courseId);
        for (let attempt = 0; attempt < 5; attempt++) {
            const state = await this.progressRepository.findForCourse(userId, courseId);
            if (!state)
                throw new NotFoundException('Không tìm thấy tiến độ học tập');
            const now = new Date();
            if (state.sessionId === dto.sessionId) {
                if (state.sessionClosed || !state.sessionExpiresAt || state.sessionExpiresAt <= now ||
                    state.sessionLessonId !== dto.lessonId || state.sessionMediaUrl !== video.url) {
                    throw new ConflictException('Phiên học đã kết thúc, vui lòng phát video để mở phiên mới');
                }
                return { sessionId: dto.sessionId, expiresAt: state.sessionExpiresAt, progress: await this.summarizeCourse(userId, courseId, state, stats) };
            }
            if (state.sessionId && !state.sessionClosed && state.sessionExpiresAt && state.sessionExpiresAt > now) {
                throw new ConflictException('Khóa học đang được phát ở tab hoặc thiết bị khác. Hãy dừng phiên đó trước.');
            }
            const changes = {
                sessionId: dto.sessionId,
                sessionLessonId: dto.lessonId,
                sessionMediaUrl: video.url,
                sessionExpiresAt: new Date(now.getTime() + PLAYBACK_LEASE_MS),
                lastHeartbeatAt: now,
                sessionWatchedMs: 0,
                lastSequence: 0,
                sessionClosed: false,
            };
            if (await this.progressRepository.compareAndSet(state, changes)) {
                return { sessionId: dto.sessionId, expiresAt: changes.sessionExpiresAt, progress: await this.summarizeCourse(userId, courseId, { ...state, ...changes, revision: state.revision + 1 }, stats) };
            }
        }
        throw new ConflictException('Tiến độ vừa thay đổi, vui lòng thử lại');
    }
    async heartbeat(userId, courseId, dto, end = false) {
        await this.requireEnrollment(userId, courseId);
        const [stats] = await this.lessonRepository.getCourseVideoStats([courseId]);
        for (let attempt = 0; attempt < 5; attempt++) {
            const state = await this.progressRepository.findForCourse(userId, courseId);
            const now = new Date();
            if (!state || state.sessionId !== dto.sessionId) {
                throw new ConflictException('Phiên học không còn hiệu lực, vui lòng phát lại video');
            }
            if (dto.sequence <= state.lastSequence) {
                return { sessionId: dto.sessionId, expiresAt: state.sessionExpiresAt ?? now, progress: await this.summarizeCourse(userId, courseId, state, stats) };
            }
            if (state.sessionClosed || !state.sessionExpiresAt || state.sessionExpiresAt <= now) {
                throw new ConflictException('Phiên học đã hết hạn, vui lòng phát lại video');
            }
            const video = stats?.videos.find((item) => item.lessonId === state.sessionLessonId && item.url === state.sessionMediaUrl);
            if (!video)
                throw new ConflictException('Video đã được thay đổi hoặc xóa khỏi khóa học');
            if (dto.watchedMs < state.sessionWatchedMs) {
                throw new BadRequestException('Thời gian tích lũy của phiên không được giảm');
            }
            const serverElapsed = Math.max(0, now.getTime() - (state.lastHeartbeatAt?.getTime() ?? now.getTime()));
            const creditedMs = Math.min(dto.watchedMs - state.sessionWatchedMs, serverElapsed, PLAYBACK_LEASE_MS);
            const changes = {
                watchedMs: state.watchedMs + creditedMs,
                sessionWatchedMs: dto.watchedMs,
                lastSequence: dto.sequence,
                lastHeartbeatAt: now,
                sessionExpiresAt: end ? now : new Date(now.getTime() + PLAYBACK_LEASE_MS),
                sessionClosed: end,
                lastLessonId: video.lessonId,
                lastMediaUrl: video.url,
                lastPositionSeconds: Math.min(dto.positionSeconds, video.durationSeconds && video.durationSeconds > 0 ? video.durationSeconds : Number.MAX_SAFE_INTEGER / 1000),
                updatedAt: now,
            };
            if (await this.progressRepository.compareAndSet(state, changes)) {
                return { sessionId: dto.sessionId, expiresAt: changes.sessionExpiresAt, progress: await this.summarizeCourse(userId, courseId, { ...state, ...changes, revision: state.revision + 1 }, stats) };
            }
        }
        throw new ConflictException('Tiến độ vừa thay đổi, vui lòng thử lại');
    }
};
LearningProgressService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LearningProgressRepository,
        EnrollmentRepository,
        CourseRepository,
        LessonRepository,
        LessonCompletionService])
], LearningProgressService);
export { LearningProgressService };
//# sourceMappingURL=learning-progress.service.js.map