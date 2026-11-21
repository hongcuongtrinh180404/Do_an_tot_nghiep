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
import { LearningStatusEnum, LessonContentTypeEnum } from 'share-lib';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { contentVersion, quizRevision, studentQuiz } from '../../course/utils/lesson-quiz-version.util.js';
import { LessonCompletionRepository } from '../repositories/lesson-completion.repository.js';
import { isQuizTimestamp } from 'share-lib';
let LessonCompletionService = class LessonCompletionService {
    repository;
    enrollments;
    courses;
    sections;
    lessons;
    quizzes;
    constructor(repository, enrollments, courses, sections, lessons, quizzes) {
        this.repository = repository;
        this.enrollments = enrollments;
        this.courses = courses;
        this.sections = sections;
        this.lessons = lessons;
        this.quizzes = quizzes;
    }
    async requireEnrollment(userId, courseId) {
        const [course, enrollment] = await Promise.all([
            this.courses.findById(courseId), this.enrollments.findByUserAndCourse(userId, courseId),
        ]);
        if (!course || course.deletedAt)
            throw new NotFoundException('Không tìm thấy khóa học');
        if (!enrollment || enrollment.deletedAt)
            throw new ForbiddenException('Bạn cần đăng ký khóa học để ghi nhận hoàn thành bài học');
    }
    async requireLesson(courseId, lessonId) {
        const lesson = await this.lessons.findById(lessonId);
        const section = lesson ? await this.sections.findById(lesson.sectionId) : null;
        if (!lesson || lesson.deletedAt || !section || section.deletedAt || section.courseId !== courseId) {
            throw new NotFoundException('Bài học không thuộc khóa học này');
        }
        if (lesson.content?.type !== LessonContentTypeEnum.VIDEO || !lesson.content.url) {
            throw new BadRequestException('Chỉ ghi nhận hoàn thành cho bài học video');
        }
        return lesson;
    }
    mediaVersion(lesson) {
        return contentVersion({ url: lesson.content?.url, publicId: lesson.content?.publicId ?? null });
    }
    async summarize(userId, courseId, lesson) {
        const mediaVersion = this.mediaVersion(lesson);
        const [quizzes, answers, videoEnded] = await Promise.all([
            this.quizzes.findByLessonId(lesson.id),
            this.repository.findAnswers(userId, lesson.id),
            this.repository.hasVideoEnded(userId, lesson.id, mediaVersion),
        ]);
        return this.buildState(courseId, lesson, quizzes, answers, videoEnded);
    }
    buildState(courseId, lesson, quizzes, answers, videoEnded) {
        quizzes = quizzes.filter((quiz) => isQuizTimestamp(quiz.timestamp, lesson.content?.duration));
        const mediaVersion = this.mediaVersion(lesson);
        const answerMap = new Map(answers.map((answer) => [`${answer.quizId}:${answer.quizRevision}`, answer]));
        const studentQuizzes = quizzes.map((quiz) => studentQuiz(quiz, answerMap.get(`${quiz.id}:${quizRevision(quiz)}`) ?? null));
        const completedQuestions = studentQuizzes.filter((quiz) => quiz.answer !== null).length;
        const complete = quizzes.length > 0 ? completedQuestions === quizzes.length : videoEnded;
        return {
            courseId, lessonId: lesson.id, mediaVersion, videoEnded,
            quizzesVersion: contentVersion(studentQuizzes.map((quiz) => [quiz.id, quiz.revision, quiz.timestamp, quiz.order])),
            completedQuestions, totalQuestions: quizzes.length,
            status: complete ? LearningStatusEnum.COMPLETED : answers.length > 0 || videoEnded ? LearningStatusEnum.IN_PROGRESS : LearningStatusEnum.NOT_STARTED,
            quizzes: studentQuizzes,
        };
    }
    async getLesson(userId, courseId, lessonId) {
        await this.requireEnrollment(userId, courseId);
        return this.summarize(userId, courseId, await this.requireLesson(courseId, lessonId));
    }
    async getLessons(userId, courseId) {
        await this.requireEnrollment(userId, courseId);
        const stats = await this.lessons.getCourseVideoStats([courseId]);
        return (await this.getSummariesForCourses(userId, stats)).get(courseId) ?? [];
    }
    async getSummariesForCourses(userId, stats, maxTimeMS) {
        const summaries = new Map();
        const lessonIds = stats.flatMap((course) => course.videos.map((video) => video.lessonId));
        if (lessonIds.length === 0)
            return summaries;
        const courseIds = stats.map((course) => course.courseId);
        const [quizzes, answers, videos] = await Promise.all([
            this.quizzes.findByLessonIds(lessonIds, ...(maxTimeMS ? [maxTimeMS] : [])),
            this.repository.findAnswersForCourses(userId, courseIds, ...(maxTimeMS ? [maxTimeMS] : [])),
            this.repository.findVideoCompletionsForCourses(userId, courseIds, ...(maxTimeMS ? [maxTimeMS] : [])),
        ]);
        const quizzesByLesson = new Map();
        for (const quiz of quizzes) {
            const group = quizzesByLesson.get(quiz.lessonId) ?? [];
            group.push(quiz);
            quizzesByLesson.set(quiz.lessonId, group);
        }
        const answersByLesson = new Map();
        for (const answer of answers) {
            const key = `${answer.courseId}:${answer.lessonId}`;
            const group = answersByLesson.get(key) ?? [];
            group.push(answer);
            answersByLesson.set(key, group);
        }
        const ended = new Set(videos.map((video) => `${video.courseId}:${video.lessonId}:${video.mediaVersion}`));
        for (const course of stats) {
            summaries.set(course.courseId, course.videos.map((video) => {
                if (!video.url)
                    return {
                        lessonId: video.lessonId, status: LearningStatusEnum.NOT_STARTED, totalQuestions: 0, completedQuestions: 0,
                    };
                const lesson = {
                    id: video.lessonId,
                    content: { type: LessonContentTypeEnum.VIDEO, url: video.url,
                        publicId: video.publicId ?? undefined, duration: video.durationSeconds ?? undefined },
                };
                const key = `${course.courseId}:${lesson.id}`;
                const state = this.buildState(course.courseId, lesson, quizzesByLesson.get(lesson.id) ?? [], answersByLesson.get(key) ?? [], ended.has(`${key}:${this.mediaVersion(lesson)}`));
                const { lessonId, status, totalQuestions, completedQuestions } = state;
                return { lessonId, status, totalQuestions, completedQuestions };
            }));
        }
        return summaries;
    }
    async submitAnswer(userId, courseId, lessonId, dto) {
        await this.requireEnrollment(userId, courseId);
        const lesson = await this.requireLesson(courseId, lessonId);
        const quiz = await this.quizzes.findById(dto.quizId);
        if (!quiz || quiz.lessonId !== lessonId)
            throw new NotFoundException('Không tìm thấy câu hỏi trong bài học');
        if (!isQuizTimestamp(quiz.timestamp, lesson.content?.duration)) {
            throw new ConflictException('Câu hỏi chưa có thời điểm xuất hiện hợp lệ. Vui lòng tải lại bài học.');
        }
        const revision = quizRevision(quiz);
        if (revision !== dto.quizRevision)
            throw new ConflictException('Câu hỏi đã được cập nhật. Vui lòng trả lời phiên bản mới.');
        const selected = dto.selectedOptionIds;
        if (!Array.isArray(selected) || selected.length === 0 || new Set(selected).size !== selected.length ||
            selected.some((id) => !quiz.options.some((option) => option.id === id)) ||
            (quiz.questionType === 'single' && selected.length !== 1)) {
            throw new BadRequestException('Phương án trả lời không hợp lệ');
        }
        const correctOptionIds = quiz.options.filter((option) => option.isCorrect).map((option) => option.id);
        await this.repository.saveAnswer(userId, courseId, lessonId, {
            quizId: quiz.id, quizRevision: revision, selectedOptionIds: selected,
            isCorrect: selected.length === correctOptionIds.length && selected.every((id) => correctOptionIds.includes(id)),
            correctOptionIds, submittedAt: new Date(),
        }, quiz);
        return this.getLesson(userId, courseId, lessonId);
    }
    async videoEnded(userId, courseId, lessonId, dto) {
        await this.requireEnrollment(userId, courseId);
        const lesson = await this.requireLesson(courseId, lessonId);
        const mediaVersion = this.mediaVersion(lesson);
        if (dto.mediaVersion !== mediaVersion)
            throw new ConflictException('Video đã được thay đổi. Vui lòng tải lại bài học.');
        const duration = lesson.content?.duration;
        if (!duration || !Number.isFinite(duration) || !Number.isFinite(dto.positionSeconds) || Math.abs(dto.positionSeconds - duration) > 1) {
            throw new BadRequestException('Video chưa kết thúc hoặc chưa xác định được thời lượng');
        }
        await this.repository.saveVideoEnded(userId, courseId, lessonId, mediaVersion);
        return this.getLesson(userId, courseId, lessonId);
    }
};
LessonCompletionService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LessonCompletionRepository,
        EnrollmentRepository,
        CourseRepository,
        SectionRepository,
        LessonRepository,
        LessonQuizRepository])
], LessonCompletionService);
export { LessonCompletionService };
//# sourceMappingURL=lesson-completion.service.js.map