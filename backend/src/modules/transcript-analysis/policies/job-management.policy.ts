import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleEnum, CourseStatusEnum, IUserProfile } from 'share-lib';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';

export interface VerifyLessonAccessOptions {
  allowPendingApproval?: boolean;
}

@Injectable()
export class JobManagementPolicy {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly sectionRepository: SectionRepository,
    private readonly courseRepository: CourseRepository,
  ) {}

  /**
   * Kiểm tra quyền của người dùng đối với bài học.
   * Dùng cho cả controller đọc trạng thái (cho phép PENDING_APPROVAL)
   * và thao tác ghi/retry (chặn PENDING_APPROVAL).
   */
  async verifyLessonAccess(
    lessonId: string,
    user?: Pick<IUserProfile, 'id' | 'role'>,
    options: VerifyLessonAccessOptions = {},
  ): Promise<{ lesson: any; section: any; course: any }> {
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
      throw new ConflictException(
        'Khóa học đang chờ phê duyệt, không thể chỉnh sửa hoặc thao tác trên bài học',
      );
    }

    return { lesson, section, course };
  }
}
