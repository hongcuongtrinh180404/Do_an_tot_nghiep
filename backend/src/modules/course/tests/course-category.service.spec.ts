import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { ICourseCategory } from 'share-lib';
import { CourseCategoryService } from '../services/course-category.service.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { StorageService } from '../../storage/index.js';

describe('CourseCategoryService', () => {
  let service: CourseCategoryService;
  let categoryRepository: {
    findById: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    findAllSorted: ReturnType<typeof vi.fn>;
    findManyWithPagination: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };
  let courseRepository: {
    countByCategoryId: ReturnType<typeof vi.fn>;
    countByCategoryIds: ReturnType<typeof vi.fn>;
  };
  let storageService: {
    uploadImage: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };

  const category: ICourseCategory = {
    id: 'cat_1',
    name: 'Lập trình',
    slug: 'lap-trinh',
    description: 'Mô tả',
    imageUrl: 'https://cdn.example.com/old.webp',
    order: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    categoryRepository = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findAllSorted: vi.fn(),
      findManyWithPagination: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
    };
    courseRepository = {
      countByCategoryId: vi.fn(),
      countByCategoryIds: vi.fn(),
    };
    storageService = {
      uploadImage: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    const cls = { get: vi.fn().mockReturnValue('admin_1') };

    service = new CourseCategoryService(
      categoryRepository as unknown as CourseCategoryRepository,
      courseRepository as unknown as CourseRepository,
      storageService as unknown as StorageService,
      cls as unknown as ClsService,
    );
  });

  describe('getPublicCategories', () => {
    it('should return only active categories with published course counts', async () => {
      categoryRepository.findAllSorted.mockResolvedValue([
        category,
        { ...category, id: 'cat_2', slug: 'bi-an', isActive: false },
      ]);
      courseRepository.countByCategoryIds.mockResolvedValue(
        new Map([
          ['cat_1', 3],
          ['cat_2', 9],
        ]),
      );

      const result = await service.getPublicCategories();

      expect(courseRepository.countByCategoryIds).toHaveBeenCalledWith({
        onlyPublished: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'cat_1', courseCount: 3 });
    });
  });

  describe('getAdminCategories', () => {
    it('should apply search filter and attach all-course counts', async () => {
      categoryRepository.findManyWithPagination.mockResolvedValue({
        items: [category],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      });
      courseRepository.countByCategoryIds.mockResolvedValue(new Map([['cat_1', 7]]));

      const result = await service.getAdminCategories({ search: 'lap' } as never);

      expect(categoryRepository.findManyWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          isPagination: false,
          filters: expect.objectContaining({ $or: expect.any(Array) }),
        }),
        undefined,
      );
      expect(courseRepository.countByCategoryIds).toHaveBeenCalledWith({
        onlyPublished: false,
      });
      expect(result[0].courseCount).toBe(7);
    });
  });

  describe('createCategory', () => {
    it('should slugify the name and create an active category', async () => {
      categoryRepository.findBySlug.mockResolvedValue(null);
      categoryRepository.create.mockResolvedValue(category);

      const result = await service.createCategory({
        name: 'Lập trình & Kỹ thuật',
        order: 2,
      } as never);

      expect(categoryRepository.findBySlug).toHaveBeenCalledWith(
        'lap-trinh-ky-thuat',
        undefined,
      );
      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Lập trình & Kỹ thuật',
          slug: 'lap-trinh-ky-thuat',
          order: 2,
          isActive: true,
          imageUrl: null,
        }),
        undefined,
      );
      expect(result).toBe(category);
    });

    it('should reject a duplicated slug', async () => {
      categoryRepository.findBySlug.mockResolvedValue({ ...category, id: 'other' });

      await expect(
        service.createCategory({ name: 'Lập trình' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(categoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('should block deletion when courses still reference the category', async () => {
      categoryRepository.findById.mockResolvedValue(category);
      courseRepository.countByCategoryId.mockResolvedValue(2);

      await expect(service.deleteCategory('cat_1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should soft delete and clean the image when no course references it', async () => {
      categoryRepository.findById.mockResolvedValue(category);
      courseRepository.countByCategoryId.mockResolvedValue(0);
      categoryRepository.softDelete.mockResolvedValue(true);

      await expect(service.deleteCategory('cat_1')).resolves.toBe(true);

      expect(categoryRepository.softDelete).toHaveBeenCalledWith('cat_1', 'admin_1', undefined);
      await vi.waitFor(() => {
        expect(storageService.deleteFile).toHaveBeenCalledWith(category.imageUrl);
      });
    });
  });

  describe('uploadImage', () => {
    it('should upload as contain 512x512 and remove the previous image', async () => {
      const file = {} as Express.Multer.File;
      categoryRepository.findById.mockResolvedValue(category);
      storageService.uploadImage.mockResolvedValue('https://cdn.example.com/new.webp');
      categoryRepository.update.mockResolvedValue({
        ...category,
        imageUrl: 'https://cdn.example.com/new.webp',
      });

      const result = await service.uploadImage('cat_1', file);

      expect(storageService.uploadImage).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          subFolder: 'courses/categories',
          width: 512,
          height: 512,
          fit: 'contain',
        }),
      );
      expect(result.imageUrl).toBe('https://cdn.example.com/new.webp');
      await vi.waitFor(() => {
        expect(storageService.deleteFile).toHaveBeenCalledWith(category.imageUrl);
      });
    });

    it('should throw NotFoundException when the category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.uploadImage('cat_missing', {} as Express.Multer.File),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
