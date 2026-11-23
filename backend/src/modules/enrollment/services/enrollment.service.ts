import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  IEnrollment,
  ICourse,
  RoleEnum,
} from 'share-lib';
import { BaseService, isDuplicateKeyError } from '../../base/index.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { assertFreeEnrollmentAllowed } from '../utils/free-enrollment.util.js';

@Injectable()
export class EnrollmentService extends BaseService<IEnrollment, string> {
  constructor(
    protected readonly enrollmentRepository: EnrollmentRepository,
    protected readonly courseRepository: CourseRepository,
    protected readonly userRepository: UserRepository,
    cls: ClsService,
  ) {
    super(enrollmentRepository, cls, EnrollmentService.name);
  }

  async checkEnrollment(
    userId: string,
    courseId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const course = await this.courseRepository.findById(courseId, session);
    if (!course || course.deletedAt) {
      return false;
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId,
      session,
    );

    return Boolean(enrollment && !enrollment.deletedAt);
  }

  async getMyPurchasedCourses(
    userId: string,
    _userRole?: RoleEnum,
    session?: ClientSession,
  ): Promise<ICourse[]> {
    const enrollments = await this.enrollmentRepository.findUserEnrollments(userId, session);

    const courseMap = new Map<string, ICourse>();

    for (const enrollment of enrollments) {
      if (enrollment.course && !enrollment.course.deletedAt) {
        courseMap.set(enrollment.course.id, enrollment.course);
      }
    }

    const courses = Array.from(courseMap.values());
    if (courses.length === 0) return [];

    const counts = await this.enrollmentRepository.countByCourseIds(courses.map((course) => course.id));
    return courses.map((course) => ({
      ...course,
      studentsCount: counts.get(course.id) ?? 0,
    }));
  }

  async registerFreeCourse(
    userId: string,
    courseId: string,
  ): Promise<IEnrollment> {
    try {
      return await this.enrollmentRepository.withTransaction(async (session) => {
        return this.createFreeEnrollment(userId, courseId, session);
      });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        const existing = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async createFreeEnrollment(
    userId: string,
    courseId: string,
    session: ClientSession,
  ): Promise<IEnrollment> {
    const user = await this.userRepository.findById(userId, session);
    const course = await this.courseRepository.findForEnrollment(courseId, session);
    assertFreeEnrollmentAllowed(userId, courseId, user, course);

    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId,
      session,
    );
    if (existingEnrollment && !existingEnrollment.deletedAt) {
      return existingEnrollment;
    }

    return this.enrollmentRepository.create(
      { userId, courseId, orderId: null, enrolledAt: new Date() },
      session,
    );
  }
}
