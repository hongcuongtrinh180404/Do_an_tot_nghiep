var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, Header, UseInterceptors, UploadedFile, ForbiddenException, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CourseService } from './services/course.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { ReorderSectionsDto } from './dto/reorder-sections.dto.js';
import { QueryCoursesAdminDto } from './dto/query-courses-admin.dto.js';
import { QueryCourseApprovalHistoryDto } from './dto/query-course-approval-history.dto.js';
import { RejectCourseDto } from './dto/reject-course.dto.js';
import { QueryPublicCoursesDto } from './dto/query-public-courses.dto.js';
import { CourseImageValidationPipe } from './pipes/course-image-validation.pipe.js';
import { CourseTrailerValidationPipe } from './pipes/course-trailer-validation.pipe.js';
let CourseController = class CourseController {
    courseService;
    constructor(courseService) {
        this.courseService = courseService;
    }
    async getPublicCourses(query) {
        const result = await this.courseService.findPublicCourses(query);
        return ApiResponse.success(result, 'Lấy danh sách khóa học thành công');
    }
    async getPublicCourseDetail(idOrSlug, viewerRole) {
        const result = await this.courseService.getPublicCourseDetail(idOrSlug, viewerRole);
        return ApiResponse.success(result, 'Lấy chi tiết khóa học thành công');
    }
    async getMyCourses(userId) {
        const courses = await this.courseService.findByInstructorId(userId);
        return ApiResponse.success(courses, 'Lấy danh sách khóa học thành công');
    }
    async getAdminCourseStats() {
        const result = await this.courseService.getAdminCourseStats();
        return ApiResponse.success(result, 'Lấy thống kê khóa học quản trị thành công');
    }
    async getAdminCourses(query) {
        const result = await this.courseService.findAdminCourses(query);
        return ApiResponse.success(result, 'Lấy danh sách khóa học quản trị thành công');
    }
    async getAdminApprovalHistoryStats() {
        const result = await this.courseService.getAdminCourseApprovalHistoryStats();
        return ApiResponse.success(result, 'Lấy thống kê lịch sử phê duyệt thành công');
    }
    async getAdminApprovalHistories(query) {
        const result = await this.courseService.findAdminCourseApprovalHistories(query);
        return ApiResponse.success(result, 'Lấy lịch sử phê duyệt khóa học thành công');
    }
    async getCourseApprovalHistory(id) {
        const result = await this.courseService.getCourseApprovalHistories(id);
        return ApiResponse.success(result, 'Lấy lịch sử phê duyệt của khóa học thành công');
    }
    async approveCourse(id, userId) {
        const course = await this.courseService.approveCourse(id, userId);
        return ApiResponse.success(course, 'Phê duyệt khóa học thành công');
    }
    async rejectCourse(id, userId, dto) {
        const course = await this.courseService.rejectCourse(id, userId, dto.reason);
        return ApiResponse.success(course, 'Yêu cầu chỉnh sửa khóa học thành công');
    }
    async getDetail(id, userId, role) {
        const course = await this.courseService.getCourseDetailForInstructor(id, userId, role);
        return ApiResponse.success(course, 'Lấy chi tiết khóa học thành công');
    }
    async update(id, userId, role, dto) {
        const course = await this.courseService.updateCourse(id, dto, userId, role);
        return ApiResponse.success(course, 'Cập nhật khóa học thành công');
    }
    async deleteCourse(id, userId, role) {
        await this.courseService.deleteCourse(id, userId, role);
        return ApiResponse.success(null, 'Xóa khóa học thành công');
    }
    async archiveCourse(id, userId, role) {
        const course = await this.courseService.archiveCourse(id, userId, role);
        return ApiResponse.success(course, 'Ngừng bán khóa học thành công');
    }
    async unarchiveCourse(id, userId, role) {
        const course = await this.courseService.unarchiveCourse(id, userId, role);
        return ApiResponse.success(course, 'Mở bán lại khóa học thành công');
    }
    async create(userId, role, dto) {
        if (role !== RoleEnum.INSTRUCTOR) {
            throw new ForbiddenException('Chỉ giảng viên được tạo khóa học');
        }
        const course = await this.courseService.createCourse({
            title: dto.title,
            slug: dto.slug,
            description: dto.description,
            thumbnailUrl: dto.thumbnailUrl,
            price: dto.price,
            level: dto.level,
            categoryId: dto.categoryId,
            instructorId: userId,
        });
        return ApiResponse.success(course, 'Tạo khóa học thành công');
    }
    async createSection(courseId, userId, role, dto) {
        const section = await this.courseService.createSection(courseId, dto, userId, role);
        return ApiResponse.success(section, 'Tạo chương học thành công');
    }
    async updateSection(courseId, sectionId, userId, role, dto) {
        const section = await this.courseService.updateSection(courseId, sectionId, dto, userId, role);
        return ApiResponse.success(section, 'Cập nhật chương học thành công');
    }
    async deleteSection(courseId, sectionId, userId, role) {
        await this.courseService.deleteSection(courseId, sectionId, userId, role);
        return ApiResponse.success(null, 'Xóa chương học thành công');
    }
    async reorderSections(courseId, userId, role, dto) {
        const sections = await this.courseService.reorderSections(courseId, dto, userId, role);
        return ApiResponse.success(sections, 'Cập nhật thứ tự chương học thành công');
    }
    async getSections(courseId) {
        const sections = await this.courseService.getSectionsByCourseId(courseId);
        return ApiResponse.success(sections, 'Lấy danh sách chương học thành công');
    }
    async uploadThumbnail(courseId, userId, role, file) {
        const course = await this.courseService.updateCourseThumbnail(courseId, userId, role, file);
        return ApiResponse.success(course, 'Cập nhật ảnh bìa khóa học thành công');
    }
    async uploadTrailer(courseId, userId, role, file) {
        const course = await this.courseService.updateCourseTrailer(courseId, userId, role, file);
        return ApiResponse.success(course, 'Cập nhật video trailer khóa học thành công');
    }
};
__decorate([
    Get(),
    Public(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryPublicCoursesDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getPublicCourses", null);
__decorate([
    Get('public/:idOrSlug'),
    Public(),
    Header('Cache-Control', 'private, no-store'),
    __param(0, Param('idOrSlug')),
    __param(1, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getPublicCourseDetail", null);
__decorate([
    Get('my-courses'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getMyCourses", null);
__decorate([
    Get('admin/stats'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getAdminCourseStats", null);
__decorate([
    Get('admin'),
    Roles(RoleEnum.ADMIN),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryCoursesAdminDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getAdminCourses", null);
__decorate([
    Get('admin/approval-history/stats'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getAdminApprovalHistoryStats", null);
__decorate([
    Get('admin/approval-history'),
    Roles(RoleEnum.ADMIN),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryCourseApprovalHistoryDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getAdminApprovalHistories", null);
__decorate([
    Get(':id/approval-history'),
    Roles(RoleEnum.ADMIN, RoleEnum.INSTRUCTOR),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getCourseApprovalHistory", null);
__decorate([
    Post(':id/approve'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "approveCourse", null);
__decorate([
    Post(':id/reject'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, RejectCourseDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "rejectCourse", null);
__decorate([
    Get(':id'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id')),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getDetail", null);
__decorate([
    Patch(':id'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, UpdateCourseDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "update", null);
__decorate([
    Delete(':id'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "deleteCourse", null);
__decorate([
    Post(':id/archive'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "archiveCourse", null);
__decorate([
    Post(':id/unarchive'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "unarchiveCourse", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    Roles(RoleEnum.INSTRUCTOR),
    __param(0, CurrentUser('id')),
    __param(1, CurrentUser('role')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateCourseDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "create", null);
__decorate([
    Post(':courseId/sections'),
    HttpCode(HttpStatus.CREATED),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, CreateSectionDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "createSection", null);
__decorate([
    Patch(':courseId/sections/:sectionId'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, Param('sectionId', ParseObjectIdPipe)),
    __param(2, CurrentUser('id')),
    __param(3, CurrentUser('role')),
    __param(4, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, UpdateSectionDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "updateSection", null);
__decorate([
    Delete(':courseId/sections/:sectionId'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, Param('sectionId', ParseObjectIdPipe)),
    __param(2, CurrentUser('id')),
    __param(3, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "deleteSection", null);
__decorate([
    Put(':courseId/sections/reorder'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, ReorderSectionsDto]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "reorderSections", null);
__decorate([
    Get(':courseId/sections'),
    Public(),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "getSections", null);
__decorate([
    Patch(':courseId/thumbnail'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseInterceptors(FileInterceptor('file')),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __param(3, UploadedFile(CourseImageValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "uploadThumbnail", null);
__decorate([
    Patch(':courseId/trailer'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseInterceptors(FileInterceptor('file')),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __param(3, UploadedFile(CourseTrailerValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], CourseController.prototype, "uploadTrailer", null);
CourseController = __decorate([
    Controller('courses'),
    __metadata("design:paramtypes", [CourseService])
], CourseController);
export { CourseController };
//# sourceMappingURL=course.controller.js.map