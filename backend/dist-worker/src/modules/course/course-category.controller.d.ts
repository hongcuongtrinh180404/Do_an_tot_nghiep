import { ICourseCategory } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { CourseCategoryService } from './services/course-category.service.js';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto.js';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto.js';
import { QueryCourseCategoriesDto } from './dto/query-course-categories.dto.js';
export declare class CourseCategoryController {
    private readonly courseCategoryService;
    constructor(courseCategoryService: CourseCategoryService);
    getPublic(): Promise<ApiResponse<ICourseCategory[]>>;
    getAdmin(query: QueryCourseCategoriesDto): Promise<ApiResponse<ICourseCategory[]>>;
    create(dto: CreateCourseCategoryDto): Promise<ApiResponse<ICourseCategory>>;
    update(id: string, dto: UpdateCourseCategoryDto): Promise<ApiResponse<ICourseCategory>>;
    uploadImage(id: string, file: Express.Multer.File): Promise<ApiResponse<ICourseCategory>>;
    remove(id: string): Promise<ApiResponse<null>>;
}
