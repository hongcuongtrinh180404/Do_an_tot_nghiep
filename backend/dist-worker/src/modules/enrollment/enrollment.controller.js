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
import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { EnrollmentService } from './services/enrollment.service.js';
import { RegisterFreeCourseDto } from './dto/register-free-course.dto.js';
let EnrollmentController = class EnrollmentController {
    enrollmentService;
    constructor(enrollmentService) {
        this.enrollmentService = enrollmentService;
    }
    async getMyCourses(userId, role) {
        const courses = await this.enrollmentService.getMyPurchasedCourses(userId, role);
        return ApiResponse.success(courses, 'Lấy danh sách khóa học đã mua thành công');
    }
    async checkEnrollment(courseId, userId) {
        const isEnrolled = await this.enrollmentService.checkEnrollment(userId, courseId);
        return ApiResponse.success({ isEnrolled }, 'Kiểm tra trạng thái sở hữu thành công');
    }
    async registerFreeCourse(userId, dto) {
        const result = await this.enrollmentService.registerFreeCourse(userId, dto.courseId);
        return ApiResponse.success(result, 'Đăng ký khóa học miễn phí thành công');
    }
};
__decorate([
    Get('my-courses'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "getMyCourses", null);
__decorate([
    Get('check/:courseId'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "checkEnrollment", null);
__decorate([
    Post('register-free'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RegisterFreeCourseDto]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "registerFreeCourse", null);
EnrollmentController = __decorate([
    Controller('enrollments'),
    __metadata("design:paramtypes", [EnrollmentService])
], EnrollmentController);
export { EnrollmentController };
//# sourceMappingURL=enrollment.controller.js.map