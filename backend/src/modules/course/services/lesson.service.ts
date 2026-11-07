import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  ILesson,
  ISection,
  ILessonContent,
  RoleEnum,
  CourseStatusEnum,
  LessonContentTypeEnum,
  LessonTranscriptionStatusEnum,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { StorageService } from '../../storage/index.js';
import { LessonTranscriptService } from './lesson-transcript.service.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';

export interface CreateLessonInput {
  title: string;
  description?: string | null;
  order: number;
  content?: ILessonContent | null;
  isPreview?: boolean;
  userId?: string;
}

@Injectable()
export class LessonService extends BaseService<ILesson, string> {
  constructor(
    protected readonly lessonRepository: LessonRepository,
    protected readonly sectionRepository: SectionRepository,
    cls: ClsService,
    @Optional() protected readonly storageService?: StorageService,
    @Optional() protected readonly courseRepository?: CourseRepository,
    @Optional() protected readonly lessonTranscriptService?: LessonTranscriptService,
    @Optional() protected readonly enrollmentRepository?: EnrollmentRepository,
  ) {
    super(lessonRepository, cls, LessonService.name);
  }

  async createLesson(
    sectionId: string,
    input: CreateLessonInput,
    session?: ClientSession,
  ): Promise<ILesson> {
    let section: ISection | null = null;
    try {
      section = await this.sectionRepository.findById(sectionId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (!section || section.deletedAt) {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (this.courseRepository) {
      const course = await this.courseRepository.findById(section.courseId, session);
      if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
        throw new ConflictException(
          'Khóa học đang trong quá trình chờ phê duyệt, không thể thêm bài học.',
        );
      }
    }

    if (input.order !== undefined && input.order < 0) {
      throw new BadRequestException('Thứ tự bài học không được nhỏ hơn 0');
    }

    const userId = input.userId ?? this.getCurrentUserId();

    const isVideo = input.content?.type === LessonContentTypeEnum.VIDEO;

    const createdLesson = await this.lessonRepository.create(
      {
        sectionId: section.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        order: input.order,
        content: input.content ?? null,
        isPreview: Boolean(input.isPreview),
        transcriptionStatus: isVideo
          ? LessonTranscriptionStatusEnum.QUEUED
          : LessonTranscriptionStatusEnum.IDLE,
        createdById: userId,
        updatedById: userId,
      },
      session,
    );

    // Kích hoạt trích xuất transcript bất đồng bộ nếu bài học có nội dung video
    if (
      isVideo &&
      (createdLesson.content?.publicId || createdLesson.content?.url) &&
      this.lessonTranscriptService
    ) {
      const fileKey = createdLesson.content.publicId || createdLesson.content.url;
      this.lessonTranscriptService.triggerTranscription(createdLesson.id, fileKey);
    }

    return createdLesson;
  }

  async getLessonsBySectionId(
    sectionId: string,
    session?: ClientSession,
  ): Promise<ILesson[]> {
    let section: ISection | null = null;
    try {
      section = await this.sectionRepository.findById(sectionId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (!section || section.deletedAt) {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    return this.lessonRepository.findBySectionId(sectionId, session);
  }

  async getLessonById(id: string, session?: ClientSession): Promise<ILesson> {
    let lesson: ILesson | null = null;
    try {
      lesson = await this.lessonRepository.findById(id, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy bài học với ID '${id}'`);
    }

    if (!lesson || lesson.deletedAt) {
      throw new NotFoundException(`Không tìm thấy bài học với ID '${id}'`);
    }

    return lesson;
  }

  async getLessonForUser(
    id: string,
    userId?: string,
    userRole?: RoleEnum,
    session?: ClientSession,
  ): Promise<ILesson> {
    const lesson = await this.getLessonById(id, session);

    // 1. Bài học xem thử cho phép truy cập công khai
    if (lesson.isPreview) {
      return lesson;
    }

    // 2. Quản trị viên được xem toàn bộ
    if (userRole === RoleEnum.ADMIN) {
      return lesson;
    }

    // Lấy courseId từ section
    let courseId: string | null = null;
    if (lesson.sectionId && this.sectionRepository) {
      const section = await this.sectionRepository.findById(lesson.sectionId, session);
      courseId = section?.courseId ?? null;
    }

    // 3. Giảng viên sở hữu khóa học được xem
    if (courseId && this.courseRepository && userId) {
      const course = await this.courseRepository.findById(courseId, session);
      const instructorIdStr = course?.instructorId ? String(course.instructorId) : '';
      if (course && (course.instructorId === userId || instructorIdStr === userId)) {
        return lesson;
      }
    }

    // 4. Học viên đã sở hữu khóa học
    if (this.enrollmentRepository && userId && courseId) {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(
        userId,
        courseId,
        session,
      );
      if (enrollment && !enrollment.deletedAt) {
        return lesson;
      }
    }

    throw new ForbiddenException('Bạn cần mua khóa học để xem nội dung bài học này');
  }

  async addMaterial(
    lessonId: string,
    file: Express.Multer.File,
    title?: string,
    userId?: string,
    userRole?: RoleEnum,
    session?: ClientSession,
  ): Promise<ILesson> {
    const lesson = await this.getLessonById(lessonId, session);

    // Kiểm tra quyền sở hữu (IDOR) & trạng thái chờ duyệt
    if (this.courseRepository) {
      const section = await this.sectionRepository.findById(lesson.sectionId, session);
      if (section) {
        const course = await this.courseRepository.findById(section.courseId, session);
        if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
          throw new ConflictException(
            'Khóa học đang trong quá trình chờ phê duyệt, không thể đính kèm tài liệu.',
          );
        }
        if (course && userId && userRole !== RoleEnum.ADMIN && course.instructorId !== userId) {
          throw new ForbiddenException('Bạn không có quyền thêm tài liệu vào bài học này');
        }
      }
    }

    if (!this.storageService) {
      throw new BadRequestException('Dịch vụ lưu trữ chưa sẵn sàng');
    }

    // Tải lên tệp vào thư mục tài liệu bài học trên MinIO
    const uploadedMedia = await this.storageService.uploadLessonMedia(
      file,
      'courses/lessons/materials',
    );

    const materialTitle = title?.trim() || uploadedMedia.fileName || 'Tài liệu đính kèm';

    const updated = await this.lessonRepository.addMaterial(
      lesson.id,
      {
        title: materialTitle,
        url: uploadedMedia.url,
        fileName: uploadedMedia.fileName || file.originalname || 'material',
        fileSize: uploadedMedia.fileSize ?? file.size,
        mimeType: uploadedMedia.mimeType ?? file.mimetype,
        publicId: uploadedMedia.publicId,
        createdAt: new Date(),
      },
      session,
    );

    if (!updated) {
      throw new NotFoundException(`Không thể cập nhật bài học với ID '${lessonId}'`);
    }

    return updated;
  }

  async deleteMaterial(
    lessonId: string,
    materialId: string,
    userId?: string,
    userRole?: RoleEnum,
    session?: ClientSession,
  ): Promise<ILesson> {
    const lesson = await this.getLessonById(lessonId, session);

    // Kiểm tra quyền sở hữu (IDOR) & trạng thái chờ duyệt
    if (this.courseRepository) {
      const section = await this.sectionRepository.findById(lesson.sectionId, session);
      if (section) {
        const course = await this.courseRepository.findById(section.courseId, session);
        if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
          throw new ConflictException(
            'Khóa học đang trong quá trình chờ phê duyệt, không thể xóa tài liệu.',
          );
        }
        if (course && userId && userRole !== RoleEnum.ADMIN && course.instructorId !== userId) {
          throw new ForbiddenException('Bạn không có quyền xóa tài liệu của bài học này');
        }
      }
    }

    const material = (lesson.materials || []).find((m) => m.id === materialId);
    if (!material) {
      throw new NotFoundException(`Không tìm thấy tài liệu với ID '${materialId}' trong bài học`);
    }

    // Gỡ tài liệu khỏi MongoDB
    const updated = await this.lessonRepository.deleteMaterial(lesson.id, materialId, session);

    // Dọn dẹp tệp vật lý trên MinIO
    if (this.storageService && material.url) {
      try {
        await this.storageService.deleteFile(material.url);
      } catch (error) {
        this.logger.warn(`Lỗi khi dọn dẹp file tài liệu ${material.url} trên MinIO: ${String(error)}`);
      }
    }

    if (!updated) {
      throw new NotFoundException(`Không thể cập nhật bài học với ID '${lessonId}'`);
    }

    return updated;
  }

  async deleteLesson(
    lessonId: string,
    userId?: string,
    userRole?: RoleEnum,
  ): Promise<boolean> {
    const lesson = await this.getLessonById(lessonId);

    // Kiểm tra quyền sở hữu khóa học (IDOR) & trạng thái chờ duyệt
    if (this.courseRepository) {
      const section = await this.sectionRepository.findById(lesson.sectionId);
      if (section) {
        const course = await this.courseRepository.findById(section.courseId);
        if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
          throw new ConflictException(
            'Khóa học đang trong quá trình chờ phê duyệt, không thể xóa bài học.',
          );
        }
        if (course && userId && userRole !== RoleEnum.ADMIN && course.instructorId !== userId) {
          throw new ForbiddenException('Bạn không có quyền xóa bài học này');
        }
      }
    }

    // Thu thập danh sách các tệp trên MinIO cần dọn dẹp vĩnh viễn
    const filesToDelete: string[] = [];
    if (lesson.content?.url) {
      filesToDelete.push(lesson.content.url);
    }
    if (lesson.materials && lesson.materials.length > 0) {
      for (const mat of lesson.materials) {
        if (mat.url) {
          filesToDelete.push(mat.url);
        }
      }
    }

    // Thực hiện xóa mềm và dồn thứ tự các bài học còn lại
    let success = false;
    try {
      await this.lessonRepository.withTransaction(async (session) => {
        success = await this.lessonRepository.softDelete(lesson.id, userId, session);
        await this.lessonRepository.reorderAfterDelete(lesson.sectionId, lesson.order, session);
      });
    } catch {
      // Fallback nếu database chưa bật Replica Set transaction
      success = await this.lessonRepository.softDelete(lesson.id, userId);
      await this.lessonRepository.reorderAfterDelete(lesson.sectionId, lesson.order);
    }

    // Dọn dẹp tệp vật lý vĩnh viễn trên MinIO
    if (this.storageService && filesToDelete.length > 0) {
      for (const fileUrl of filesToDelete) {
        try {
          await this.storageService.deleteFile(fileUrl);
        } catch (error) {
          this.logger.warn(`Lỗi khi dọn dẹp file ${fileUrl} trên MinIO: ${String(error)}`);
        }
      }
    }

    return success;
  }
}
