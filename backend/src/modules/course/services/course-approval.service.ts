import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CourseStatusEnum, type ICourse, type ICourseApprovalChecklist, RoleEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { buildCourseApprovalChecklist } from '../utils/course-approval.util.js';
import { CourseService } from './course.service.js';

@Injectable()
export class CourseApprovalService {
  constructor(
    private readonly courseService: CourseService,
    private readonly courseRepository: CourseRepository,
    private readonly categoryRepository: CourseCategoryRepository,
    private readonly sectionRepository: SectionRepository,
    private readonly lessonRepository: LessonRepository,
  ) {}

  private async checkCourse(course: ICourse): Promise<ICourseApprovalChecklist> {
    const [category, sections] = await Promise.all([
      course.categoryId ? this.categoryRepository.findById(course.categoryId) : null,
      this.sectionRepository.findByCourseId(course.id),
    ]);
    const lessons = await this.lessonRepository.findBySectionIds(sections.map((section) => section.id));
    return buildCourseApprovalChecklist(
      course,
      Boolean(category && !category.deletedAt && category.isActive),
      sections,
      lessons,
    );
  }

  async getChecklist(courseId: string, userId: string, role: RoleEnum): Promise<ICourseApprovalChecklist> {
    const course = await this.courseService.getCourseDetailForInstructor(courseId, userId, role);
    return this.checkCourse(course);
  }

  async requestApproval(courseId: string, userId: string, role: RoleEnum): Promise<ICourse> {
    const course = await this.courseService.getCourseDetailForInstructor(courseId, userId, role);
    if (course.status !== CourseStatusEnum.DRAFT) {
      throw new ConflictException('Chỉ khóa học ở trạng thái bản nháp mới có thể gửi yêu cầu phê duyệt.');
    }

    // Always inspect persisted data again, even when the dialog previously passed.
    const checklist = await this.checkCourse(course);
    if (!checklist.canSubmit) {
      throw new BadRequestException({
        message: 'Khóa học chưa đủ điều kiện phê duyệt. Vui lòng hoàn thành các mục còn thiếu.',
        checklist,
      });
    }

    const updatedCourse = await this.courseRepository.requestApproval(course, userId);
    if (!updatedCourse) {
      throw new ConflictException('Khóa học vừa thay đổi hoặc đã được gửi duyệt. Vui lòng kiểm tra lại.');
    }
    return updatedCourse;
  }
}
