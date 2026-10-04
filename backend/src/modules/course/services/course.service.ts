import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  ICourse,
  ISection,
  IUser,
  RoleEnum,
  UserStatusEnum,
  CourseStatusEnum,
  CourseLevelEnum,
  slugify,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { CreateSectionDto } from '../dto/create-section.dto.js';
import { ReorderSectionsDto } from '../dto/reorder-sections.dto.js';
import { UpdateCourseDto } from '../dto/update-course.dto.js';
import { StorageService } from '../../storage/index.js';

export interface CreateCourseInput {
  title: string;
  slug: string;
  instructorId: string;
  description?: string | null;
  shortDescription?: string | null;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  price?: number;
  status?: CourseStatusEnum;
  level?: CourseLevelEnum;
}

@Injectable()
export class CourseService extends BaseService<ICourse, string> {
  constructor(
    protected readonly courseRepository: CourseRepository,
    protected readonly sectionRepository: SectionRepository,
    protected readonly userRepository: UserRepository,
    protected readonly storageService: StorageService,
    cls: ClsService,
  ) {
    super(courseRepository, cls, CourseService.name);
  }

  async validateInstructor(instructorId: string, session?: ClientSession): Promise<IUser> {
    const instructor = await this.userRepository.findById(instructorId, session);

    if (!instructor || instructor.deletedAt) {
      throw new NotFoundException(`Instructor with ID '${instructorId}' not found`);
    }

    if (instructor.status !== UserStatusEnum.ACTIVE) {
      throw new BadRequestException(
        `Instructor account is not active (current status: ${instructor.status})`,
      );
    }

    const authorizedRoles = [RoleEnum.INSTRUCTOR, RoleEnum.ADMIN];
    if (!authorizedRoles.includes(instructor.role)) {
      throw new ForbiddenException(
        `User with ID '${instructorId}' is not authorized to create courses (role: ${instructor.role})`,
      );
    }

    return instructor;
  }

  async ensureSlugNotTaken(slug: string, session?: ClientSession): Promise<void> {
    const normalizedSlug = slug.toLowerCase().trim();
    const existing = await this.courseRepository.findBySlug(normalizedSlug, session);
    if (existing) {
      throw new ConflictException(`Course with slug '${normalizedSlug}' already exists`);
    }
  }

  async findBySlug(slug: string, session?: ClientSession): Promise<ICourse | null> {
    return this.courseRepository.findBySlug(slug, session);
  }

  async findByInstructorId(instructorId: string, session?: ClientSession): Promise<ICourse[]> {
    return this.courseRepository.findByInstructorId(instructorId, session);
  }

  async getCourseDetailForInstructor(
    courseId: string,
    currentUserId: string,
    currentUserRole: RoleEnum,
    session?: ClientSession,
  ): Promise<ICourse> {
    let course: ICourse | null = null;
    try {
      course = await this.courseRepository.findById(courseId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (currentUserRole !== RoleEnum.ADMIN && course.instructorId !== currentUserId) {
      throw new ForbiddenException('Bạn không có quyền truy cập khóa học này');
    }

    return course;
  }

  async createCourse(input: CreateCourseInput, session?: ClientSession): Promise<ICourse> {
    const normalizedSlug = input.slug.toLowerCase().trim();

    // 1. Validate instructor status and permissions
    await this.validateInstructor(input.instructorId, session);

    // 2. Validate price constraint (price >= 0)
    if (input.price !== undefined && input.price < 0) {
      throw new BadRequestException('Course price must be greater than or equal to 0');
    }

    // 3. Ensure slug uniqueness among active courses
    await this.ensureSlugNotTaken(normalizedSlug, session);

    // 4. Create course using BaseService (inherits audit context from cls)
    return this.create(
      {
        title: input.title.trim(),
        slug: normalizedSlug,
        instructorId: input.instructorId,
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        price: input.price ?? 0,
        status: input.status ?? CourseStatusEnum.DRAFT,
        level: input.level ?? CourseLevelEnum.ALL_LEVELS,
      } as unknown as Partial<ICourse>,
      session,
    );
  }

  async createSection(
    courseId: string,
    dto: CreateSectionDto,
    userId: string,
    role: RoleEnum,
    session?: ClientSession,
  ): Promise<ISection> {
    let course: ICourse | null = null;
    try {
      course = await this.courseRepository.findById(courseId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm chương học vào khóa học này',
      );
    }

    let targetOrder = dto.order;
    if (targetOrder === undefined || targetOrder === null) {
      const existingSections = await this.sectionRepository.findByCourseId(courseId, session);
      targetOrder = existingSections.length;
    }

    const section = await this.sectionRepository.create(
      {
        courseId: course.id,
        title: dto.title,
        description: dto.description ?? null,
        order: targetOrder,
        createdById: userId,
        updatedById: userId,
      },
      session,
    );

    return section;
  }

  async reorderSections(
    courseId: string,
    dto: ReorderSectionsDto,
    userId: string,
    role: RoleEnum,
    session?: ClientSession,
  ): Promise<ISection[]> {
    let course: ICourse | null = null;
    try {
      course = await this.courseRepository.findById(courseId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền sắp xếp chương học của khóa học này',
      );
    }

    const uniqueIds = new Set(dto.sectionIds);
    if (uniqueIds.size !== dto.sectionIds.length) {
      throw new BadRequestException('Danh sách ID chương học chứa các phần tử trùng lặp');
    }

    const existingSections = await this.sectionRepository.findByCourseId(courseId, session);
    const existingIds = new Set(existingSections.map((s) => s.id));

    const allBelong = dto.sectionIds.every((id) => existingIds.has(id));
    if (!allBelong || dto.sectionIds.length !== existingSections.length) {
      throw new BadRequestException(
        'Danh sách ID chương học không hợp lệ hoặc không khớp với các chương hiện có của khóa học',
      );
    }

    return this.sectionRepository.reorderSections(courseId, dto.sectionIds, userId, session);
  }

  async getSectionsByCourseId(
    courseId: string,
    session?: ClientSession,
  ): Promise<ISection[]> {
    let course: ICourse | null = null;
    try {
      course = await this.courseRepository.findById(courseId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    return this.sectionRepository.findByCourseId(courseId, session);
  }

  async updateCourseThumbnail(
    courseId: string,
    userId: string,
    role: RoleEnum,
    file: Express.Multer.File,
    session?: ClientSession,
  ): Promise<ICourse> {
    const course = await this.getCourseDetailForInstructor(courseId, userId, role, session);

    const oldThumbnailUrl = course.thumbnailUrl;

    const newThumbnailUrl = await this.storageService.uploadImage(file, {
      subFolder: 'courses/thumbnail',
      width: 1280,
      height: 720,
      quality: 85,
    });

    if (oldThumbnailUrl) {
      this.storageService.deleteFile(oldThumbnailUrl).catch((err: unknown) => {
        this.logger.warn(
          `Không thể xóa ảnh thumbnail cũ: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return this.updateOrFail(
      courseId,
      { thumbnailUrl: newThumbnailUrl } as unknown as Partial<ICourse>,
      session,
    );
  }

  async updateCourseTrailer(
    courseId: string,
    userId: string,
    role: RoleEnum,
    file: Express.Multer.File,
    session?: ClientSession,
  ): Promise<ICourse> {
    const course = await this.getCourseDetailForInstructor(courseId, userId, role, session);

    const oldTrailerUrl = course.trailerUrl;

    const lessonContent = await this.storageService.uploadLessonMedia(file, 'courses/trailer');

    if (oldTrailerUrl) {
      this.storageService.deleteFile(oldTrailerUrl).catch((err: unknown) => {
        this.logger.warn(
          `Không thể xóa video trailer cũ: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return this.updateOrFail(
      courseId,
      { trailerUrl: lessonContent.url } as unknown as Partial<ICourse>,
      session,
    );
  }

  async generateUniqueSlug(
    baseSlug: string,
    excludeCourseId: string,
    session?: ClientSession,
  ): Promise<string> {
    const normalized = slugify(baseSlug);
    const conflictingSlugs = await this.courseRepository.findConflictingSlugs(
      normalized,
      excludeCourseId,
      session,
    );

    if (!conflictingSlugs || conflictingSlugs.length === 0) {
      return normalized;
    }

    if (!conflictingSlugs.includes(normalized)) {
      return normalized;
    }

    let maxSuffix = 0;
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suffixRegex = new RegExp(`^${escaped}-([0-9]+)$`, 'i');

    for (const slug of conflictingSlugs) {
      const match = slug.match(suffixRegex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxSuffix) {
          maxSuffix = num;
        }
      }
    }

    return `${normalized}-${maxSuffix + 1}`;
  }

  async updateCourse(
    courseId: string,
    dto: UpdateCourseDto,
    userId: string,
    role: RoleEnum,
    session?: ClientSession,
  ): Promise<ICourse> {
    // 1. Fetch course and check authorization
    const course = await this.getCourseDetailForInstructor(courseId, userId, role, session);

    // 2. Validate price constraint
    const targetPrice = dto.price !== undefined ? dto.price : course.price;
    const targetOriginalPrice =
      dto.originalPrice !== undefined ? dto.originalPrice : course.originalPrice;

    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Giá khóa học không được nhỏ hơn 0');
    }

    if (dto.originalPrice !== undefined && dto.originalPrice !== null && dto.originalPrice < 0) {
      throw new BadRequestException('Giá gốc khóa học không được nhỏ hơn 0');
    }

    if (
      targetOriginalPrice !== null &&
      targetOriginalPrice !== undefined &&
      targetPrice > targetOriginalPrice
    ) {
      throw new BadRequestException('Giá bán không được lớn hơn giá gốc');
    }

    // 3. Handle slug update
    let updatedSlug: string | undefined = undefined;
    if (dto.slug) {
      const normalizedSlug = slugify(dto.slug);
      if (normalizedSlug !== course.slug) {
        const conflicting = await this.courseRepository.findConflictingSlugs(
          normalizedSlug,
          courseId,
          session,
        );
        if (conflicting.includes(normalizedSlug)) {
          throw new ConflictException(`Đường dẫn slug '${normalizedSlug}' đã tồn tại`);
        }
        updatedSlug = normalizedSlug;
      }
    } else if (dto.title && dto.title.trim() !== course.title) {
      updatedSlug = await this.generateUniqueSlug(dto.title.trim(), courseId, session);
    }

    // 4. Prepare update payload
    const updateData: Partial<ICourse> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (updatedSlug !== undefined) updateData.slug = updatedSlug;
    if (dto.shortDescription !== undefined) updateData.shortDescription = dto.shortDescription;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;
    if (dto.trailerUrl !== undefined) updateData.trailerUrl = dto.trailerUrl;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.originalPrice !== undefined) updateData.originalPrice = dto.originalPrice;
    if (dto.level !== undefined) updateData.level = dto.level;
    if (dto.status !== undefined) updateData.status = dto.status;

    // 5. Execute update via BaseService
    return this.updateOrFail(courseId, updateData as unknown as Partial<ICourse>, session);
  }
}
