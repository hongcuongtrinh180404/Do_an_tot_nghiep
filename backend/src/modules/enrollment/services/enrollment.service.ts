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
  IOrder,
  ICourse,
  OrderStatusEnum,
  CourseStatusEnum,
  UserStatusEnum,
  RoleEnum,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';

export interface PurchaseResult {
  order: IOrder;
  enrollment: IEnrollment;
}

@Injectable()
export class EnrollmentService extends BaseService<IEnrollment, string> {
  constructor(
    protected readonly enrollmentRepository: EnrollmentRepository,
    protected readonly orderRepository: OrderRepository,
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

  async mockPurchase(
    userId: string,
    courseId: string,
  ): Promise<PurchaseResult> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE) {
      throw new BadRequestException('Tài khoản người dùng không hợp lệ hoặc đã bị vô hiệu hóa');
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (course.status !== CourseStatusEnum.PUBLISHED) {
      throw new BadRequestException('Khóa học chưa được phê duyệt hoặc chưa công khai');
    }

    // Kiểm tra nếu giảng viên mua chính khóa học của mình
    if (course.instructorId === userId) {
      throw new ConflictException('Bạn là giảng viên tạo khóa học này, bạn đã tự động sở hữu khóa học');
    }

    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId,
    );
    if (existingEnrollment && !existingEnrollment.deletedAt) {
      throw new ConflictException('Bạn đã sở hữu khóa học này');
    }

    return await this.enrollmentRepository.withTransaction(async (session) => {
      // Re-check within transaction session to guarantee idempotency under concurrent clicks
      const concurrentCheck = await this.enrollmentRepository.findByUserAndCourse(
        userId,
        courseId,
        session,
      );
      if (concurrentCheck && !concurrentCheck.deletedAt) {
        throw new ConflictException('Bạn đã sở hữu khóa học này');
      }

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const orderCode = `DH${Date.now().toString().slice(-6)}${randomSuffix}`;

      const order = await this.orderRepository.create(
        {
          orderCode,
          userId,
          courseId,
          amount: course.price,
          status: OrderStatusEnum.PAID,
        },
        session,
      );

      const enrollment = await this.enrollmentRepository.create(
        {
          userId,
          courseId,
          orderId: order.id,
          enrolledAt: new Date(),
        },
        session,
      );

      return {
        order,
        enrollment,
      };
    });
  }
}

