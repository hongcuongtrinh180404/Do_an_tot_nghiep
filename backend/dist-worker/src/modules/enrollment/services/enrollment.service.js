var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EnrollmentService_1;
import { Injectable, NotFoundException, BadRequestException, ConflictException, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CourseStatusEnum, UserStatusEnum, } from 'share-lib';
import { BaseService, isDuplicateKeyError } from '../../base/index.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
let EnrollmentService = EnrollmentService_1 = class EnrollmentService extends BaseService {
    enrollmentRepository;
    courseRepository;
    userRepository;
    constructor(enrollmentRepository, courseRepository, userRepository, cls) {
        super(enrollmentRepository, cls, EnrollmentService_1.name);
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }
    async checkEnrollment(userId, courseId, session) {
        const course = await this.courseRepository.findById(courseId, session);
        if (!course || course.deletedAt) {
            return false;
        }
        const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId, session);
        return Boolean(enrollment && !enrollment.deletedAt);
    }
    async getMyPurchasedCourses(userId, _userRole, session) {
        const enrollments = await this.enrollmentRepository.findUserEnrollments(userId, session);
        const courseMap = new Map();
        for (const enrollment of enrollments) {
            if (enrollment.course && !enrollment.course.deletedAt) {
                courseMap.set(enrollment.course.id, enrollment.course);
            }
        }
        const courses = Array.from(courseMap.values());
        if (courses.length === 0)
            return [];
        const counts = await this.enrollmentRepository.countByCourseIds(courses.map((course) => course.id));
        return courses.map((course) => ({
            ...course,
            studentsCount: counts.get(course.id) ?? 0,
        }));
    }
    async registerFreeCourse(userId, courseId) {
        try {
            return await this.enrollmentRepository.withTransaction(async (session) => {
                return this.createFreeEnrollment(userId, courseId, session);
            });
        }
        catch (error) {
            if (isDuplicateKeyError(error)) {
                const existing = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
                if (existing)
                    return existing;
            }
            throw error;
        }
    }
    async createFreeEnrollment(userId, courseId, session) {
        const user = await this.userRepository.findById(userId, session);
        if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE) {
            throw new BadRequestException('Tài khoản người dùng không hợp lệ hoặc đã bị vô hiệu hóa');
        }
        const course = await this.courseRepository.findForEnrollment(courseId, session);
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (course.status !== CourseStatusEnum.PUBLISHED) {
            throw new BadRequestException('Khóa học chưa được phê duyệt hoặc chưa công khai');
        }
        if (course.price !== 0) {
            throw new BadRequestException('Chỉ được đăng ký trực tiếp khóa học miễn phí. Khóa học có phí phải thanh toán qua SePay');
        }
        if (course.instructorId === userId) {
            throw new ConflictException('Bạn là giảng viên tạo khóa học này, không thể tự đăng ký khóa học của chính mình');
        }
        const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId, session);
        if (existingEnrollment && !existingEnrollment.deletedAt) {
            return existingEnrollment;
        }
        return this.enrollmentRepository.create({ userId, courseId, orderId: null, enrolledAt: new Date() }, session);
    }
};
EnrollmentService = EnrollmentService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [EnrollmentRepository,
        CourseRepository,
        UserRepository,
        ClsService])
], EnrollmentService);
export { EnrollmentService };
//# sourceMappingURL=enrollment.service.js.map