import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { CourseStatusEnum, RoleEnum, UserStatusEnum } from 'share-lib';
import { EnrollmentService } from '../services/enrollment.service.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';

describe('EnrollmentService', () => {
  const course = { id: 'course', title: 'Free course', price: 0, status: CourseStatusEnum.PUBLISHED, instructorId: 'teacher' };
  const enrollment = { id: 'enrollment', userId: 'student', courseId: 'course', orderId: null, course };
  const session = {} as ClientSession;
  let service: EnrollmentService;
  let enrollments: { findByUserAndCourse: ReturnType<typeof vi.fn>; findUserEnrollments: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; withTransaction: ReturnType<typeof vi.fn> };
  let courses: { findById: ReturnType<typeof vi.fn>; findForEnrollment: ReturnType<typeof vi.fn>; findByInstructorId: ReturnType<typeof vi.fn> };
  let users: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    enrollments = {
      findByUserAndCourse: vi.fn().mockResolvedValue(null),
      findUserEnrollments: vi.fn().mockResolvedValue([enrollment]),
      create: vi.fn().mockResolvedValue(enrollment),
      withTransaction: vi.fn(async (operation: (session: ClientSession) => Promise<unknown>) => operation(session)),
    };
    courses = {
      findById: vi.fn().mockResolvedValue(course), findForEnrollment: vi.fn().mockResolvedValue(course),
      findByInstructorId: vi.fn().mockResolvedValue([]),
    };
    users = { findById: vi.fn().mockResolvedValue({ id: 'student', status: UserStatusEnum.ACTIVE }) };
    service = new EnrollmentService(
      enrollments as unknown as EnrollmentRepository, courses as unknown as CourseRepository,
      users as unknown as UserRepository, { get: vi.fn() } as unknown as ClsService,
    );
  });

  it('recognizes the author of a published course', async () => {
    expect(await service.checkEnrollment('teacher', 'course')).toBe(true);
    expect(enrollments.findByUserAndCourse).not.toHaveBeenCalled();
  });

  it('recognizes an active enrollment', async () => {
    enrollments.findByUserAndCourse.mockResolvedValue(enrollment);
    expect(await service.checkEnrollment('student', 'course')).toBe(true);
  });

  it('does not grant access to missing courses or missing enrollments', async () => {
    expect(await service.checkEnrollment('student', 'course')).toBe(false);
    courses.findById.mockResolvedValue(null);
    expect(await service.checkEnrollment('student', 'course')).toBe(false);
  });

  it('returns enrolled courses and merges published authored courses without duplicates', async () => {
    expect(await service.getMyPurchasedCourses('student', RoleEnum.STUDENT)).toEqual([course]);
    courses.findByInstructorId.mockResolvedValue([course, { ...course, id: 'authored' }, { ...course, id: 'draft', status: CourseStatusEnum.DRAFT }]);
    expect((await service.getMyPurchasedCourses('teacher', RoleEnum.INSTRUCTOR)).map((item) => item.id)).toEqual(['course', 'authored']);
  });

  it('registers a free course without creating any order or payment', async () => {
    expect(await service.registerFreeCourse('student', 'course')).toEqual(enrollment);
    expect(enrollments.create).toHaveBeenCalledWith({
      userId: 'student', courseId: 'course', orderId: null, enrolledAt: expect.any(Date),
    }, session);
    expect(courses.findForEnrollment).toHaveBeenCalledWith('course', session);
    expect(users.findById).toHaveBeenCalledWith('student', session);
  });

  it.each([100000, -1, NaN])('rejects direct registration for a non-free price (%s)', async (price) => {
    courses.findForEnrollment.mockResolvedValue({ ...course, price });
    await expect(service.registerFreeCourse('student', 'course')).rejects.toThrow(BadRequestException);
    expect(enrollments.create).not.toHaveBeenCalled();
  });

  it('is idempotent when the free course is already enrolled', async () => {
    enrollments.findByUserAndCourse.mockResolvedValue(enrollment);
    expect(await service.registerFreeCourse('student', 'course')).toEqual(enrollment);
    expect(enrollments.create).not.toHaveBeenCalled();
  });

  it('returns the winning enrollment after a concurrent unique-key collision', async () => {
    enrollments.withTransaction.mockRejectedValue({ code: 11000 });
    enrollments.findByUserAndCourse.mockResolvedValue(enrollment);
    expect(await service.registerFreeCourse('student', 'course')).toEqual(enrollment);
  });

  it('rejects invalid users', async () => {
    users.findById.mockResolvedValue(null);
    await expect(service.registerFreeCourse('student', 'course')).rejects.toThrow(BadRequestException);
  });

  it('rejects missing courses', async () => {
    courses.findForEnrollment.mockResolvedValue(null);
    await expect(service.registerFreeCourse('student', 'course')).rejects.toThrow(NotFoundException);
  });

  it('rejects unpublished courses and author self-registration', async () => {
    courses.findForEnrollment.mockResolvedValue({ ...course, status: CourseStatusEnum.DRAFT });
    await expect(service.registerFreeCourse('student', 'course')).rejects.toThrow(BadRequestException);
    courses.findForEnrollment.mockResolvedValue(course);
    await expect(service.registerFreeCourse('teacher', 'course')).rejects.toThrow(ConflictException);
  });
});
