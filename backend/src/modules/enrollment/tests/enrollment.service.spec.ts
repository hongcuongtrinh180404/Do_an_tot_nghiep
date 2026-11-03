import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  CourseStatusEnum,
  CourseLevelEnum,
  RoleEnum,
  UserStatusEnum,
  IUser,
  ICourse,
  IEnrollment,
  IOrder,
  OrderStatusEnum,
} from 'share-lib';
import { EnrollmentService } from '../services/enrollment.service.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let mockEnrollmentRepository: {
    findByUserAndCourse: ReturnType<typeof vi.fn>;
    findUserEnrollments: ReturnType<typeof vi.fn>;
    countByCourseId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    withTransaction: ReturnType<typeof vi.fn>;
  };
  let mockOrderRepository: {
    create: ReturnType<typeof vi.fn>;
    findByOrderCode: ReturnType<typeof vi.fn>;
  };
  let mockCourseRepository: {
    findById: ReturnType<typeof vi.fn>;
    findByInstructorId: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockClsService: Partial<ClsService>;

  const mockUser: IUser = {
    id: 'user-1',
    email: 'student@example.com',
    username: 'student1',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    isEmailVerified: true,
    firstName: 'Van A',
    lastName: 'Nguyen',
    fullName: 'Nguyen Van A',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCourse: ICourse = {
    id: 'course-1',
    title: 'Khóa học TypeScript Chuyên Sâu',
    slug: 'khoa-hoc-typescript-chuyen-sau',
    price: 299000,
    instructorId: 'inst-1',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.INTERMEDIATE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEnrollment: IEnrollment = {
    id: 'enrollment-1',
    userId: 'user-1',
    courseId: 'course-1',
    orderId: 'order-1',
    enrolledAt: new Date(),
    course: mockCourse,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockEnrollmentRepository = {
      findByUserAndCourse: vi.fn(),
      findUserEnrollments: vi.fn(),
      countByCourseId: vi.fn(),
      create: vi.fn(),
      withTransaction: vi.fn((cb: (session: ClientSession) => Promise<unknown>) =>
        cb({} as ClientSession),
      ),
    };

    mockOrderRepository = {
      create: vi.fn(),
      findByOrderCode: vi.fn(),
    };

    mockCourseRepository = {
      findById: vi.fn(),
      findByInstructorId: vi.fn(),
    };

    mockUserRepository = {
      findById: vi.fn(),
    };

    mockClsService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new EnrollmentService(
      mockEnrollmentRepository as unknown as EnrollmentRepository,
      mockOrderRepository as unknown as OrderRepository,
      mockCourseRepository as unknown as CourseRepository,
      mockUserRepository as unknown as UserRepository,
      mockClsService as ClsService,
    );
  });

  describe('checkEnrollment', () => {
    it('1. should return true if user is the instructor of published course', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        ...mockCourse,
        instructorId: 'user-1',
      });

      const result = await service.checkEnrollment('user-1', 'course-1');
      expect(result).toBe(true);
      expect(mockEnrollmentRepository.findByUserAndCourse).not.toHaveBeenCalled();
    });

    it('2. should return true if user has an active enrollment record', async () => {
      mockCourseRepository.findById.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(mockEnrollment);

      const result = await service.checkEnrollment('user-1', 'course-1');
      expect(result).toBe(true);
    });

    it('3. should return false if course not found or deleted', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      const result = await service.checkEnrollment('user-1', 'course-1');
      expect(result).toBe(false);
    });

    it('4. should return false if enrollment is deleted or not found', async () => {
      mockCourseRepository.findById.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(null);

      const result = await service.checkEnrollment('user-1', 'course-1');
      expect(result).toBe(false);
    });
  });

  describe('getMyPurchasedCourses', () => {
    it('5. should return enrolled courses for student', async () => {
      mockEnrollmentRepository.findUserEnrollments.mockResolvedValue([mockEnrollment]);

      const result = await service.getMyPurchasedCourses('user-1', RoleEnum.STUDENT);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('course-1');
      expect(mockCourseRepository.findByInstructorId).not.toHaveBeenCalled();
    });

    it('6. should merge authored published courses for instructor', async () => {
      mockEnrollmentRepository.findUserEnrollments.mockResolvedValue([mockEnrollment]);
      const authoredCourse: ICourse = {
        ...mockCourse,
        id: 'course-authored-2',
        instructorId: 'inst-user',
        status: CourseStatusEnum.PUBLISHED,
      };
      mockCourseRepository.findByInstructorId.mockResolvedValue([authoredCourse]);

      const result = await service.getMyPurchasedCourses('inst-user', RoleEnum.INSTRUCTOR);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toContain('course-1');
      expect(result.map((c) => c.id)).toContain('course-authored-2');
    });

    it('7. should not duplicate course if instructor bought their own course', async () => {
      mockEnrollmentRepository.findUserEnrollments.mockResolvedValue([mockEnrollment]);
      mockCourseRepository.findByInstructorId.mockResolvedValue([mockCourse]);

      const result = await service.getMyPurchasedCourses('user-1', RoleEnum.INSTRUCTOR);
      expect(result).toHaveLength(1);
    });
  });

  describe('mockPurchase', () => {
    it('8. should successfully purchase a course and create Order and Enrollment in transaction', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockCourseRepository.findById.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(null);

      const createdOrder: IOrder = {
        id: 'order-123',
        orderCode: 'DH123456',
        userId: 'user-1',
        courseId: 'course-1',
        amount: 299000,
        status: OrderStatusEnum.PAID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockOrderRepository.create.mockResolvedValue(createdOrder);

      const createdEnrollment: IEnrollment = {
        id: 'enrollment-123',
        userId: 'user-1',
        courseId: 'course-1',
        orderId: 'order-123',
        enrolledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockEnrollmentRepository.create.mockResolvedValue(createdEnrollment);

      const result = await service.mockPurchase('user-1', 'course-1');

      expect(result.order).toEqual(createdOrder);
      expect(result.enrollment).toEqual(createdEnrollment);
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          courseId: 'course-1',
          amount: 299000,
          status: OrderStatusEnum.PAID,
        }),
        expect.anything(),
      );
      expect(mockEnrollmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          courseId: 'course-1',
          orderId: 'order-123',
        }),
        expect.anything(),
      );
    });

    it('9. should throw NotFoundException if course does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(service.mockPurchase('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('10. should throw BadRequestException if course is not PUBLISHED', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockCourseRepository.findById.mockResolvedValue({
        ...mockCourse,
        status: CourseStatusEnum.DRAFT,
      });

      await expect(service.mockPurchase('user-1', 'course-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('11. should throw ConflictException if instructor purchases their own course', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockCourseRepository.findById.mockResolvedValue({
        ...mockCourse,
        instructorId: 'user-1',
      });

      await expect(service.mockPurchase('user-1', 'course-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('12. should throw ConflictException if user already has an active enrollment', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockCourseRepository.findById.mockResolvedValue(mockCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(mockEnrollment);

      await expect(service.mockPurchase('user-1', 'course-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
