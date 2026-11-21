import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ICourseCategory } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { StorageService } from '../../storage/index.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { CreateCourseCategoryDto } from '../dto/create-course-category.dto.js';
import { UpdateCourseCategoryDto } from '../dto/update-course-category.dto.js';
import { QueryCourseCategoriesDto } from '../dto/query-course-categories.dto.js';
export declare class CourseCategoryService extends BaseService<ICourseCategory, string> {
    protected readonly courseCategoryRepository: CourseCategoryRepository;
    protected readonly courseRepository: CourseRepository;
    protected readonly storageService: StorageService;
    constructor(courseCategoryRepository: CourseCategoryRepository, courseRepository: CourseRepository, storageService: StorageService, cls: ClsService);
    getPublicCategories(session?: ClientSession): Promise<ICourseCategory[]>;
    getAdminCategories(query: QueryCourseCategoriesDto, session?: ClientSession): Promise<ICourseCategory[]>;
    getCategoryOrFail(id: string, session?: ClientSession): Promise<ICourseCategory>;
    ensureSlugNotTaken(slug: string, excludeCategoryId?: string, session?: ClientSession): Promise<void>;
    createCategory(dto: CreateCourseCategoryDto, session?: ClientSession): Promise<ICourseCategory>;
    updateCategory(id: string, dto: UpdateCourseCategoryDto, session?: ClientSession): Promise<ICourseCategory>;
    uploadImage(id: string, file: Express.Multer.File, session?: ClientSession): Promise<ICourseCategory>;
    deleteCategory(id: string, session?: ClientSession): Promise<boolean>;
}
