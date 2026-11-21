var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CourseCategoryService_1;
import { BadRequestException, ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { slugify } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { StorageService } from '../../storage/index.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
let CourseCategoryService = CourseCategoryService_1 = class CourseCategoryService extends BaseService {
    courseCategoryRepository;
    courseRepository;
    storageService;
    constructor(courseCategoryRepository, courseRepository, storageService, cls) {
        super(courseCategoryRepository, cls, CourseCategoryService_1.name);
        this.courseCategoryRepository = courseCategoryRepository;
        this.courseRepository = courseRepository;
        this.storageService = storageService;
    }
    async getPublicCategories(session) {
        const categories = await this.courseCategoryRepository.findAllSorted(session);
        const counts = await this.courseRepository.countByCategoryIds({ onlyPublished: true });
        return categories
            .filter((category) => category.isActive)
            .map((category) => ({
            ...category,
            courseCount: counts.get(category.id) ?? 0,
        }));
    }
    async getAdminCategories(query, session) {
        const filters = {};
        if (query.search?.trim()) {
            const keyword = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(keyword, 'i');
            filters.$or = [{ name: regex }, { slug: regex }];
        }
        if (query.isActive !== undefined) {
            filters.isActive = query.isActive;
        }
        const result = await this.courseCategoryRepository.findManyWithPagination({
            page: 1,
            limit: 100,
            isPagination: false,
            sort: [
                { orderBy: 'order', order: 'asc' },
                { orderBy: 'name', order: 'asc' },
            ],
            filters,
        }, session);
        const counts = await this.courseRepository.countByCategoryIds({ onlyPublished: false });
        return result.items.map((category) => ({
            ...category,
            courseCount: counts.get(category.id) ?? 0,
        }));
    }
    async getCategoryOrFail(id, session) {
        let category = null;
        try {
            category = await this.courseCategoryRepository.findById(id, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy danh mục với ID '${id}'`);
        }
        if (!category || category.deletedAt) {
            throw new NotFoundException(`Không tìm thấy danh mục với ID '${id}'`);
        }
        return category;
    }
    async ensureSlugNotTaken(slug, excludeCategoryId, session) {
        const existing = await this.courseCategoryRepository.findBySlug(slug, session);
        if (existing && existing.id !== excludeCategoryId) {
            throw new ConflictException(`Đường dẫn slug '${slug}' đã tồn tại`);
        }
    }
    async createCategory(dto, session) {
        const normalizedSlug = slugify(dto.slug?.trim() || dto.name);
        if (!normalizedSlug) {
            throw new BadRequestException('Không thể tạo slug từ tên danh mục. Vui lòng nhập slug thủ công.');
        }
        await this.ensureSlugNotTaken(normalizedSlug, undefined, session);
        return this.create({
            name: dto.name.trim(),
            slug: normalizedSlug,
            description: dto.description ?? null,
            imageUrl: null,
            order: dto.order ?? 0,
            isActive: dto.isActive ?? true,
        }, session);
    }
    async updateCategory(id, dto, session) {
        await this.getCategoryOrFail(id, session);
        const updateData = {};
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
    async uploadImage(id, file, session) {
        const category = await this.getCategoryOrFail(id, session);
        const oldImageUrl = category.imageUrl;
        const imageUrl = await this.storageService.uploadImage(file, {
            subFolder: 'courses/categories',
            width: 512,
            height: 512,
            quality: 85,
            fit: 'contain',
        });
        const updated = await this.updateOrFail(id, { imageUrl }, session);
        if (oldImageUrl && oldImageUrl !== imageUrl) {
            this.storageService.deleteFile(oldImageUrl).catch((err) => {
                this.logger.warn(`Không thể xóa ảnh danh mục cũ: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return updated;
    }
    async deleteCategory(id, session) {
        const category = await this.getCategoryOrFail(id, session);
        const courseCount = await this.courseRepository.countByCategoryId(id);
        if (courseCount > 0) {
            throw new ConflictException(`Danh mục đang có ${courseCount} khóa học. Vui lòng chuyển các khóa học sang danh mục khác trước khi xóa.`);
        }
        const deleted = await this.softDelete(id, session);
        if (deleted && category.imageUrl) {
            this.storageService.deleteFile(category.imageUrl).catch((err) => {
                this.logger.warn(`Không thể xóa ảnh danh mục: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return deleted;
    }
};
CourseCategoryService = CourseCategoryService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CourseCategoryRepository,
        CourseRepository,
        StorageService,
        ClsService])
], CourseCategoryService);
export { CourseCategoryService };
//# sourceMappingURL=course-category.service.js.map