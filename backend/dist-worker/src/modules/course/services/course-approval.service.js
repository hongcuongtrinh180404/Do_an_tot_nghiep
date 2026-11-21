var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CourseStatusEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { buildCourseApprovalChecklist } from '../utils/course-approval.util.js';
import { CourseService } from './course.service.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
let CourseApprovalService = class CourseApprovalService {
    courseService;
    courseRepository;
    categoryRepository;
    sectionRepository;
    lessonRepository;
    lessonQuizRepository;
    constructor(courseService, courseRepository, categoryRepository, sectionRepository, lessonRepository, lessonQuizRepository) {
        this.courseService = courseService;
        this.courseRepository = courseRepository;
        this.categoryRepository = categoryRepository;
        this.sectionRepository = sectionRepository;
        this.lessonRepository = lessonRepository;
        this.lessonQuizRepository = lessonQuizRepository;
    }
    async checkCourse(course) {
        const [category, sections] = await Promise.all([
            course.categoryId ? this.categoryRepository.findById(course.categoryId) : null,
            this.sectionRepository.findByCourseId(course.id),
        ]);
        const lessons = await this.lessonRepository.findBySectionIds(sections.map((section) => section.id));
        const quizzes = await this.lessonQuizRepository.findByLessonIds(lessons.map((lesson) => lesson.id));
        return buildCourseApprovalChecklist(course, Boolean(category && !category.deletedAt && category.isActive), sections, lessons, quizzes);
    }
    async getChecklist(courseId, userId, role) {
        const course = await this.courseService.getCourseDetailForInstructor(courseId, userId, role);
        return this.checkCourse(course);
    }
    async requestApproval(courseId, userId, role) {
        const course = await this.courseService.getCourseDetailForInstructor(courseId, userId, role);
        if (course.status !== CourseStatusEnum.DRAFT) {
            throw new ConflictException('Chỉ khóa học ở trạng thái bản nháp mới có thể gửi yêu cầu phê duyệt.');
        }
        const checklist = await this.checkCourse(course);
        if (!checklist.canSubmit) {
            throw new BadRequestException({
                message: 'Khóa học chưa đủ điều kiện phê duyệt. Vui lòng hoàn thành các mục còn thiếu.',
                checklist,
            });
        }
        const updatedCourse = await this.courseRepository.requestApproval(course, userId);
        if (!updatedCourse) {
            throw new ConflictException('Khóa học vừa thay đổi hoặc đã được gửi duyệt. Vui lòng kiểm tra lại.');
        }
        return updatedCourse;
    }
    async withdrawApproval(courseId, userId, role) {
        const course = await this.courseService.getCourseDetailForInstructor(courseId, userId, role);
        if (course.status !== CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Chỉ có thể hủy yêu cầu phê duyệt khi khóa học đang ở trạng thái chờ duyệt.');
        }
        const updatedCourse = await this.courseRepository.withdrawApproval(courseId, userId);
        if (!updatedCourse) {
            throw new ConflictException('Khóa học vừa thay đổi trạng thái hoặc đã được quản trị viên xử lý. Vui lòng tải lại trang.');
        }
        return updatedCourse;
    }
};
CourseApprovalService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CourseService,
        CourseRepository,
        CourseCategoryRepository,
        SectionRepository,
        LessonRepository,
        LessonQuizRepository])
], CourseApprovalService);
export { CourseApprovalService };
//# sourceMappingURL=course-approval.service.js.map