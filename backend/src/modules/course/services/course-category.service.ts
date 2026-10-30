import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ICourseCategory, slugify } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { StorageService } from '../../storage/index.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { CreateCourseCategoryDto } from '../dto/create-course-category.dto.js';
import { UpdateCourseCategoryDto } from '../dto/update-course-category.dto.js';
import { QueryCourseCategoriesDto } from '../dto/query-course-categories.dto.js';

@Injectable()
export class CourseCategoryService extends BaseService<ICourseCategory, string> {
  constructor(
    protected readonly courseCategoryRepository: CourseCategoryRepository,
    protected readonly courseRepository: CourseRepository,
    protected readonly storageService: StorageService,
    cls: ClsService,
  ) {
    super(courseCategoryRepository, cls, CourseCategoryService.name);
  }

  async getPublicCategories(session?: ClientSession): Promise<ICourseCategory[]> {
    const categories = await this.courseCategoryRepository.findAllSorted(session);
    const counts = await this.courseRepository.countByCategoryIds({ onlyPublished: true });

    return categories
      .filter((category) => category.isActive)
      .map((category) => ({
        ...category,
        courseCount: counts.get(category.id) ?? 0,
      }));
  }

  async getAdminCategories(
    query: QueryCourseCategoriesDto,
    session?: ClientSession,
  ): Promise<ICourseCategory[]> {
    const filters: Record<string, unknown> = {};

    if (query.search?.trim()) {
      const keyword = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(keyword, 'i');
      filters.$or = [{ name: regex }, { slug: regex }];
    }

    if (query.isActive !== undefined) {
      filters.isActive = query.isActive;
    }

    const result = await this.courseCategoryRepository.findManyWithPagination(
      {
        page: 1,
        limit: 100,
        isPagination: false,
        sort: [
          { orderBy: 'order', order: 'asc' },
          { orderBy: 'name', order: 'asc' },
        ],
        filters,
      },
      session,
    );

    const counts = await this.courseRepository.countByCategoryIds({ onlyPublished: false });

    return result.items.map((category) => ({
      ...category,
      courseCount: counts.get(category.id) ?? 0,
    }));
  }

  async getCategoryOrFail(id: string, session?: ClientSession): Promise<ICourseCategory> {
    let category: ICourseCategory | null = null;
    try {
      category = await this.courseCategoryRepository.findById(id, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy danh mục với ID '${id}'`);
    }

    if (!category || category.deletedAt) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID '${id}'`);
    }

    return category;
  }

  async ensureSlugNotTaken(
    slug: string,
    excludeCategoryId?: string,
    session?: ClientSession,
  ): Promise<void> {
    const existing = await this.courseCategoryRepository.findBySlug(slug, session);
    if (existing && existing.id !== excludeCategoryId) {
      throw new ConflictException(`Đường dẫn slug '${slug}' đã tồn tại`);
    }
  }

  async createCategory(
    dto: CreateCourseCategoryDto,
    session?: ClientSession,
  ): Promise<ICourseCategory> {
    const normalizedSlug = slugify(dto.slug?.trim() || dto.name);

    if (!normalizedSlug) {
      throw new BadRequestException('Không thể tạo slug từ tên danh mục. Vui lòng nhập slug thủ công.');
    }

    await this.ensureSlugNotTaken(normalizedSlug, undefined, session);

    return this.create(
      {
        name: dto.name.trim(),
        slug: normalizedSlug,
        description: dto.description ?? null,
        imageUrl: null,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      } as unknown as Partial<ICourseCategory>,
      session,
    );
  }

  async updateCategory(
    id: string,
    dto: UpdateCourseCategoryDto,
    session?: ClientSession,
  ): Promise<ICourseCategory> {
    await this.getCategoryOrFail(id, session);

    const updateData: Partial<ICourseCategory> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.slug !== undefined) {
      const normalizedSlug = slugify(dto.slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Slug danh mục không hợp lệ');
      }
      await this.ensureSlugNotTaken(normalizedSlug, id, session);
      updateData.slug = normalizedSlug;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.order !== undefined) {
      updateData.order = dto.order;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.updateOrFail(id, updateData, session);
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File,
    session?: ClientSession,
  ): Promise<ICourseCategory> {
    const category = await this.getCategoryOrFail(id, session);
    const oldImageUrl = category.imageUrl;

    const imageUrl = await this.storageService.uploadImage(file, {
      subFolder: 'courses/categories',
      width: 512,
      height: 512,
      quality: 85,
      fit: 'contain',
    });

    const updated = await this.updateOrFail(
      id,
      { imageUrl } as unknown as Partial<ICourseCategory>,
      session,
    );

    if (oldImageUrl && oldImageUrl !== imageUrl) {
      this.storageService.deleteFile(oldImageUrl).catch((err: unknown) => {
        this.logger.warn(
          `Không thể xóa ảnh danh mục cũ: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return updated;
  }

  async deleteCategory(id: string, session?: ClientSession): Promise<boolean> {
    const category = await this.getCategoryOrFail(id, session);
    const courseCount = await this.courseRepository.countByCategoryId(id);

    if (courseCount > 0) {
      throw new ConflictException(
        `Danh mục đang có ${courseCount} khóa học. Vui lòng chuyển các khóa học sang danh mục khác trước khi xóa.`,
      );
    }

    const deleted = await this.softDelete(id, session);

    if (deleted && category.imageUrl) {
      this.storageService.deleteFile(category.imageUrl).catch((err: unknown) => {
        this.logger.warn(
          `Không thể xóa ảnh danh mục: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return deleted;
  }
}
