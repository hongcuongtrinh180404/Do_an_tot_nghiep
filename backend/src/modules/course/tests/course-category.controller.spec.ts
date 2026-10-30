import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { RoleEnum, type ICourseCategory } from 'share-lib';
import { CourseCategoryController } from '../course-category.controller.js';
import { CourseCategoryService } from '../services/course-category.service.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import type { CreateCourseCategoryDto } from '../dto/create-course-category.dto.js';
import type { UpdateCourseCategoryDto } from '../dto/update-course-category.dto.js';

describe('CourseCategoryController', () => {
  let controller: CourseCategoryController;
  let service: {
    getPublicCategories: ReturnType<typeof vi.fn>;
    getAdminCategories: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
    uploadImage: ReturnType<typeof vi.fn>;
    deleteCategory: ReturnType<typeof vi.fn>;
  };

  const category: ICourseCategory = {
    id: 'cat_1',
    name: 'Lập trình',
    slug: 'lap-trinh',
    description: null,
    imageUrl: null,
    order: 0,
    isActive: true,
    courseCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = {
      getPublicCategories: vi.fn(),
      getAdminCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      uploadImage: vi.fn(),
      deleteCategory: vi.fn(),
    };
    controller = new CourseCategoryController(
      service as unknown as CourseCategoryService,
    );
  });

  it('exposes GET /course-categories publicly', () => {
    const reflector = new Reflector();
    // oxlint-disable-next-line typescript/unbound-method
    const handler = CourseCategoryController.prototype.getPublic;

    expect(reflector.get<boolean>(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('protects every admin endpoint with the ADMIN role', () => {
    const reflector = new Reflector();
    const methods = [
      // oxlint-disable-next-line typescript/unbound-method
      CourseCategoryController.prototype.getAdmin,
      // oxlint-disable-next-line typescript/unbound-method
      CourseCategoryController.prototype.create,
      // oxlint-disable-next-line typescript/unbound-method
      CourseCategoryController.prototype.update,
      // oxlint-disable-next-line typescript/unbound-method
      CourseCategoryController.prototype.uploadImage,
      // oxlint-disable-next-line typescript/unbound-method
      CourseCategoryController.prototype.remove,
    ];

    for (const handler of methods) {
      expect(reflector.get<RoleEnum[]>(ROLES_KEY, handler)).toEqual([RoleEnum.ADMIN]);
    }
  });

  it('returns public categories through ApiResponse', async () => {
    service.getPublicCategories.mockResolvedValue([category]);

    const response = await controller.getPublic();

    expect(response.success).toBe(true);
    expect(response.data).toEqual([category]);
  });

  it('delegates create, update, upload and delete to the service', async () => {
    service.createCategory.mockResolvedValue(category);
    service.updateCategory.mockResolvedValue(category);
    service.uploadImage.mockResolvedValue(category);
    service.deleteCategory.mockResolvedValue(true);

    await controller.create({ name: 'Lập trình' } as CreateCourseCategoryDto);
    await controller.update('cat_1', { name: 'Lập trình mới' } as UpdateCourseCategoryDto);
    await controller.uploadImage('cat_1', {} as Express.Multer.File);
    const removed = await controller.remove('cat_1');

    expect(service.createCategory).toHaveBeenCalledWith({ name: 'Lập trình' });
    expect(service.updateCategory).toHaveBeenCalledWith('cat_1', {
      name: 'Lập trình mới',
    });
    expect(service.uploadImage).toHaveBeenCalledWith('cat_1', {});
    expect(service.deleteCategory).toHaveBeenCalledWith('cat_1');
    expect(removed.success).toBe(true);
  });
});
