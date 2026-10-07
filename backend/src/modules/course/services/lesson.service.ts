import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ILesson, ISection, ILessonContent, RoleEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { StorageService } from '../../storage/index.js';

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

    if (input.order !== undefined && input.order < 0) {
      throw new BadRequestException('Thứ tự bài học không được nhỏ hơn 0');
    }

    const userId = input.userId ?? this.getCurrentUserId();

    return this.lessonRepository.create(
      {
        sectionId: section.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        order: input.order,
        content: input.content ?? null,
        isPreview: Boolean(input.isPreview),
        createdById: userId,
        updatedById: userId,
      },
      session,
    );
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

  async addMaterial(
    lessonId: string,
    file: Express.Multer.File,
    title?: string,
    userId?: string,
    userRole?: RoleEnum,
    session?: ClientSession,
  ): Promise<ILesson> {
    const lesson = await this.getLessonById(lessonId, session);

    // Kiểm tra quyền sở hữu (IDOR)
    if (this.courseRepository && userId && userRole !== RoleEnum.ADMIN) {
      const section = await this.sectionRepository.findById(lesson.sectionId, session);
      if (section) {
        const course = await this.courseRepository.findById(section.courseId, session);
        if (course && course.instructorId !== userId) {
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

    // Kiểm tra quyền sở hữu (IDOR)
    if (this.courseRepository && userId && userRole !== RoleEnum.ADMIN) {
      const section = await this.sectionRepository.findById(lesson.sectionId, session);
      if (section) {
        const course = await this.courseRepository.findById(section.courseId, session);
        if (course && course.instructorId !== userId) {
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

    // Kiểm tra quyền sở hữu khóa học (IDOR)
    if (this.courseRepository && userId && userRole !== RoleEnum.ADMIN) {
      const section = await this.sectionRepository.findById(lesson.sectionId);
      if (section) {
        const course = await this.courseRepository.findById(section.courseId);
        if (course && course.instructorId !== userId) {
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
