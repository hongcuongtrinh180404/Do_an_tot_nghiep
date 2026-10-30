import { Injectable, Logger } from '@nestjs/common';
import { ISeeder, ISeederOptions } from '../../../database/seeds/seeder.interface.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { COURSE_CATEGORY_SEED_DATA } from './course-category.seed.data.js';

@Injectable()
export class CourseCategorySeeder implements ISeeder {
  readonly name = 'CourseCategorySeeder';
  private readonly logger = new Logger(CourseCategorySeeder.name);

  constructor(private readonly courseCategoryRepository: CourseCategoryRepository) {}

  async run(options?: ISeederOptions): Promise<void> {
    const isRefresh = Boolean(options?.refresh);
    this.logger.log(`Starting Course Category Seeder (refresh: ${isRefresh})...`);

    let createdCount = 0;
    let refreshedCount = 0;
    let skippedCount = 0;

    for (const item of COURSE_CATEGORY_SEED_DATA) {
      const existing = await this.courseCategoryRepository.findBySlugIncludingDeleted(item.slug);

      if (existing) {
        if (isRefresh) {
          if (existing.deletedAt) {
            await this.courseCategoryRepository.restore(existing.id);
          }
          await this.courseCategoryRepository.update(existing.id, {
            name: item.name,
            slug: item.slug,
            description: item.description ?? null,
            order: item.order,
            isActive: item.isActive,
            // Ảnh của danh mục đã xóa mềm cũng bị xóa khỏi storage, nên không
            // giữ lại URL cũ khi restore để tránh ảnh hỏng trên UI.
            ...(existing.deletedAt
              ? { imageUrl: item.imageUrl ?? null }
              : item.imageUrl
                ? { imageUrl: item.imageUrl }
                : {}),
          });
          this.logger.log(`[REFRESH] Updated category: ${item.slug}`);
          refreshedCount++;
        } else {
          this.logger.log(`[SKIP] Category already exists: ${item.slug}`);
          skippedCount++;
        }
      } else {
        await this.courseCategoryRepository.create({
          name: item.name,
          slug: item.slug,
          description: item.description ?? null,
          imageUrl: item.imageUrl ?? null,
          order: item.order,
          isActive: item.isActive,
        });
        this.logger.log(`[CREATED] Seeded category: ${item.slug}`);
        createdCount++;
      }
    }

    this.logger.log(
      `Course Category Seeder completed: ${createdCount} created, ${refreshedCount} refreshed, ${skippedCount} skipped.`,
    );
  }
}
