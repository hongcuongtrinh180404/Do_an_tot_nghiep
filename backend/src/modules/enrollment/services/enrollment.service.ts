import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  IEnrollment,
  ICourse,
  CourseStatusEnum,
  UserStatusEnum,
  RoleEnum,
} from 'share-lib';
import { BaseService, isDuplicateKeyError } from '../../base/index.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';

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

    // Giảng viên tạo khóa học tự động được xem là sở hữu khóa học khi khóa học đã công khai
    if (course.instructorId === userId && course.status === CourseStatusEnum.PUBLISHED) {
      return true;
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
    userRole?: RoleEnum,
    session?: ClientSession,
  ): Promise<ICourse[]> {
    const enrollments = await this.enrollmentRepository.findUserEnrollments(userId, session);

    const courseMap = new Map<string, ICourse>();

    for (const enrollment of enrollments) {
      if (enrollment.course && !enrollment.course.deletedAt) {
        courseMap.set(enrollment.course.id, enrollment.course);
      }
    }

    // Nếu người dùng là Giảng viên (hoặc có khóa học do mình xuất bản), tự động đưa vào danh sách Khóa học đã mua
    if (userRole === RoleEnum.INSTRUCTOR || userRole === RoleEnum.ADMIN) {
      const authoredCourses = await this.courseRepository.findByInstructorId(userId, session);
      for (const authored of authoredCourses) {
        if (authored.status === CourseStatusEnum.PUBLISHED && !authored.deletedAt) {
          if (!courseMap.has(authored.id)) {
            courseMap.set(authored.id, authored);
          }
        }
      }
    }

    return Array.from(courseMap.values());
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

    // Kiểm tra nếu giảng viên mua chính khóa học của mình
    if (course.instructorId === userId) {
      throw new ConflictException('Bạn là giảng viên tạo khóa học này, bạn đã tự động sở hữu khóa học');
    }

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
