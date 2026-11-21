var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CourseCategorySeeder_1;
import { Injectable, Logger } from '@nestjs/common';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { COURSE_CATEGORY_SEED_DATA } from './course-category.seed.data.js';
let CourseCategorySeeder = CourseCategorySeeder_1 = class CourseCategorySeeder {
    courseCategoryRepository;
    name = 'CourseCategorySeeder';
    logger = new Logger(CourseCategorySeeder_1.name);
    constructor(courseCategoryRepository) {
        this.courseCategoryRepository = courseCategoryRepository;
    }
    async run(options) {
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
                        ...(existing.deletedAt
                            ? { imageUrl: item.imageUrl ?? null }
                            : item.imageUrl
                                ? { imageUrl: item.imageUrl }
                                : {}),
                    });
                    this.logger.log(`[REFRESH] Updated category: ${item.slug}`);
                    refreshedCount++;
                }
                else {
                    this.logger.log(`[SKIP] Category already exists: ${item.slug}`);
                    skippedCount++;
                }
            }
            else {
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
        this.logger.log(`Course Category Seeder completed: ${createdCount} created, ${refreshedCount} refreshed, ${skippedCount} skipped.`);
    }
};
CourseCategorySeeder = CourseCategorySeeder_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CourseCategoryRepository])
], CourseCategorySeeder);
export { CourseCategorySeeder };
//# sourceMappingURL=course-category.seeder.js.map