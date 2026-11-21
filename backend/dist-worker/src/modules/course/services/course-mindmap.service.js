var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CourseMindmapService_1;
import { Injectable, NotFoundException, ForbiddenException, ConflictException, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RoleEnum, CourseStatusEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
let CourseMindmapService = CourseMindmapService_1 = class CourseMindmapService extends BaseService {
    courseMindmapRepository;
    courseRepository;
    constructor(courseMindmapRepository, courseRepository, cls) {
        super(courseMindmapRepository, cls, CourseMindmapService_1.name);
        this.courseMindmapRepository = courseMindmapRepository;
        this.courseRepository = courseRepository;
    }
    async getMindmapByCourseId(courseId) {
        const course = await this.courseRepository.findById(courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Khóa học với ID '${courseId}' không tồn tại`);
        }
        const mindmap = await this.courseMindmapRepository.findByCourseId(courseId);
        return mindmap ? mindmap.mindmapData : null;
    }
    async findMindmapEntity(courseId) {
        const course = await this.courseRepository.findById(courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Khóa học với ID '${courseId}' không tồn tại`);
        }
        return this.courseMindmapRepository.findByCourseId(courseId);
    }
    async upsertMindmap(courseId, mindmapData, userId, userRole) {
        const course = await this.courseRepository.findById(courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Khóa học với ID '${courseId}' không tồn tại`);
        }
        const isOwner = course.instructorId === userId;
        const isAdmin = userRole === RoleEnum.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException('Bạn không có quyền cập nhật sơ đồ tư duy của khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể cập nhật sơ đồ tư duy.');
        }
        this.logger.log(`Upserting mindmap for courseId=${courseId} by userId=${userId}`);
        return this.courseMindmapRepository.upsertByCourseId(courseId, mindmapData, userId);
    }
};
CourseMindmapService = CourseMindmapService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CourseMindmapRepository,
        CourseRepository,
        ClsService])
], CourseMindmapService);
export { CourseMindmapService };
//# sourceMappingURL=course-mindmap.service.js.map