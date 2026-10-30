import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ICourseCategory } from 'share-lib';
import { CourseCategorySeeder } from '../seeds/course-category.seeder.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { COURSE_CATEGORY_SEED_DATA } from '../seeds/course-category.seed.data.js';

describe('CourseCategorySeeder', () => {
  let seeder: CourseCategorySeeder;
  let repository: {
    findBySlugIncludingDeleted: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };

  const firstSeed = COURSE_CATEGORY_SEED_DATA[0];

  const existingCategory: ICourseCategory = {
    id: 'cat_1',
    name: 'Tên cũ',
    slug: firstSeed.slug,
    description: null,
    imageUrl: null,
    order: 0,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    repository = {
      findBySlugIncludingDeleted: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      restore: vi.fn(),
    };
    seeder = new CourseCategorySeeder(
      repository as unknown as CourseCategoryRepository,
    );
  });

  it('creates every missing category on the first run', async () => {
    repository.findBySlugIncludingDeleted.mockResolvedValue(null);

    await seeder.run();

    expect(repository.create).toHaveBeenCalledTimes(COURSE_CATEGORY_SEED_DATA.length);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: firstSeed.name,
        slug: firstSeed.slug,
        order: firstSeed.order,
        isActive: true,
      }),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('skips existing categories when refresh is disabled', async () => {
    repository.findBySlugIncludingDeleted.mockResolvedValue(existingCategory);

    await seeder.run();

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.restore).not.toHaveBeenCalled();
  });

  it('updates existing categories when refresh is enabled', async () => {
    repository.findBySlugIncludingDeleted.mockResolvedValue(existingCategory);

    await seeder.run({ refresh: true });

    expect(repository.restore).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      existingCategory.id,
      expect.objectContaining({
        name: firstSeed.name,
        slug: firstSeed.slug,
        order: firstSeed.order,
        isActive: true,
      }),
    );
  });

  it('restores a soft-deleted category before refreshing it and clears its stale image', async () => {
    const deletedCategory = {
      ...existingCategory,
      imageUrl: 'https://cdn.example.com/categories/deleted.webp',
      deletedAt: new Date(),
    };
    repository.findBySlugIncludingDeleted.mockResolvedValue(deletedCategory);

    await seeder.run({ refresh: true });

    expect(repository.restore).toHaveBeenCalledWith(deletedCategory.id);
    expect(repository.update).toHaveBeenCalledWith(
      deletedCategory.id,
      expect.objectContaining({ slug: firstSeed.slug, imageUrl: null }),
    );
  });
});
