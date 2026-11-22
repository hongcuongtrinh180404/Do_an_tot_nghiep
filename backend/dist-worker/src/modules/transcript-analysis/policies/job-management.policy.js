var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException, } from '@nestjs/common';
import { RoleEnum, CourseStatusEnum } from 'share-lib';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
let JobManagementPolicy = class JobManagementPolicy {
    lessonRepository;
    sectionRepository;
    courseRepository;
    constructor(lessonRepository, sectionRepository, courseRepository) {
        this.lessonRepository = lessonRepository;
        this.sectionRepository = sectionRepository;
        this.courseRepository = courseRepository;
    }
    async verifyLessonAccess(lessonId, user, options = {}) {
        if (!user?.id) {
            throw new UnauthorizedException('Vui lòng đăng nhập để thao tác');
        }
        if (user.role !== RoleEnum.INSTRUCTOR && user.role !== RoleEnum.ADMIN) {
            throw new ForbiddenException('Bạn không có quyền thao tác trên nội dung bài học');
        }
        const lesson = await this.lessonRepository.findById(lessonId);
        if (!lesson || lesson.deletedAt) {
            throw new NotFoundException('Không tìm thấy bài học');
        }
        const section = await this.sectionRepository.findById(lesson.sectionId);
        if (!section || section.deletedAt) {
            throw new NotFoundException('Không tìm thấy chương học');
        }
        const course = await this.courseRepository.findById(section.courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }
        if (user.role !== RoleEnum.ADMIN && String(course.instructorId) !== user.id) {
            throw new ForbiddenException('Bạn không có quyền thao tác trên khóa học này');
        }
        if (!options.allowPendingApproval && course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang chờ phê duyệt, không thể chỉnh sửa hoặc thao tác trên bài học');
        }
        return { lesson, section, course };
    }
};
JobManagementPolicy = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LessonRepository,
        SectionRepository,
        CourseRepository])
], JobManagementPolicy);
export { JobManagementPolicy };
//# sourceMappingURL=job-management.policy.js.map