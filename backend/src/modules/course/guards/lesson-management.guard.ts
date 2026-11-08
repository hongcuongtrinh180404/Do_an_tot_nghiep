import {
  BadRequestException,
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CourseStatusEnum, RoleEnum, type IUserProfile } from 'share-lib';
import { ParseObjectIdPipe } from '../../base/index.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';

interface LessonManagementRequest {
  user?: Pick<IUserProfile, 'id' | 'role'>;
  params: { id?: string; sectionId?: string; quizId?: string };
}

/** Authorizes against the actual lesson -> section -> course, never a client-supplied mode/course. */
@Injectable()
export class LessonManagementGuard implements CanActivate {
  private readonly objectIdPipe = new ParseObjectIdPipe();

  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly sectionRepository: SectionRepository,
    private readonly courseRepository: CourseRepository,
    private readonly lessonQuizRepository: LessonQuizRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, params } = context.switchToHttp().getRequest<LessonManagementRequest>();
    if (!user?.id) {
      throw new UnauthorizedException('Vui lòng đăng nhập để biên tập bài học');
    }
    if (user.role !== RoleEnum.INSTRUCTOR && user.role !== RoleEnum.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền biên tập nội dung bài học');
    }

    // Guards run before parameter pipes, so validate route IDs before repository access.
    let lessonId = params.id;
    if (params.quizId) {
      const quizId = this.objectIdPipe.transform(params.quizId);
      const quiz = await this.lessonQuizRepository.findById(quizId);
      // Repository lookups exclude soft-deleted quizzes.
      if (!quiz) {
        throw new NotFoundException('Không tìm thấy câu hỏi');
      }
      lessonId = quiz.lessonId;
    }

    let sectionId = params.sectionId;
    if (lessonId) {
      const lesson = await this.lessonRepository.findById(this.objectIdPipe.transform(lessonId));
      if (!lesson || lesson.deletedAt) {
        throw new NotFoundException('Không tìm thấy bài học');
      }
      sectionId = lesson.sectionId;
    }
    if (!sectionId) {
      throw new BadRequestException('Không xác định được chương học cần biên tập');
    }

    const section = await this.sectionRepository.findById(this.objectIdPipe.transform(sectionId));
    if (!section || section.deletedAt) {
      throw new NotFoundException('Không tìm thấy chương học');
    }
    const course = await this.courseRepository.findById(section.courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }
    if (user.role !== RoleEnum.ADMIN && String(course.instructorId) !== user.id) {
      throw new ForbiddenException('Bạn không có quyền biên tập nội dung khóa học này');
    }
    if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
      throw new ConflictException('Khóa học đang chờ phê duyệt, không thể biên tập nội dung bài học');
    }

    return true;
  }
}
