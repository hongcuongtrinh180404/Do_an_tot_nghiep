var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException, } from '@nestjs/common';
import { CourseStatusEnum, RoleEnum } from 'share-lib';
import { ParseObjectIdPipe } from '../../base/index.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
let LessonManagementGuard = class LessonManagementGuard {
    lessonRepository;
    sectionRepository;
    courseRepository;
    lessonQuizRepository;
    objectIdPipe = new ParseObjectIdPipe();
    constructor(lessonRepository, sectionRepository, courseRepository, lessonQuizRepository) {
        this.lessonRepository = lessonRepository;
        this.sectionRepository = sectionRepository;
        this.courseRepository = courseRepository;
        this.lessonQuizRepository = lessonQuizRepository;
    }
    async canActivate(context) {
        const { user, params } = context.switchToHttp().getRequest();
        if (!user?.id) {
            throw new UnauthorizedException('Vui lòng đăng nhập để biên tập bài học');
        }
        if (user.role !== RoleEnum.INSTRUCTOR && user.role !== RoleEnum.ADMIN) {
            throw new ForbiddenException('Bạn không có quyền biên tập nội dung bài học');
        }
        let lessonId = params.id;
        if (params.quizId) {
            const quizId = this.objectIdPipe.transform(params.quizId);
            const quiz = await this.lessonQuizRepository.findById(quizId);
            if (!quiz) {
                throw new NotFoundException('Không tìm thấy câu hỏi');
            }
            lessonId = quiz.lessonId;
        }
        let sectionId = params.sectionId;
        if (lessonId) {
            const lesson = await this.lessonRepository.findById(this.objectIdPipe.transform(lessonId));
            if (!lesson || lesson.deletedAt) {
                throw new NotFoundException('Không tìm thấy bài học');
            }
            sectionId = lesson.sectionId;
        }
        if (!sectionId) {
            throw new BadRequestException('Không xác định được chương học cần biên tập');
        }
        const section = await this.sectionRepository.findById(this.objectIdPipe.transform(sectionId));
        if (!section || section.deletedAt) {
            throw new NotFoundException('Không tìm thấy chương học');
        }
        const course = await this.courseRepository.findById(section.courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }
        if (user.role !== RoleEnum.ADMIN && String(course.instructorId) !== user.id) {
            throw new ForbiddenException('Bạn không có quyền biên tập nội dung khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang chờ phê duyệt, không thể biên tập nội dung bài học');
        }
        return true;
    }
};
LessonManagementGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LessonRepository,
        SectionRepository,
        CourseRepository,
        LessonQuizRepository])
], LessonManagementGuard);
export { LessonManagementGuard };
//# sourceMappingURL=lesson-management.guard.js.map