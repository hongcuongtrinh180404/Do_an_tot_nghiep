var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CourseCategoryService } from './services/course-category.service.js';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto.js';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto.js';
import { QueryCourseCategoriesDto } from './dto/query-course-categories.dto.js';
import { CourseCategoryImageValidationPipe } from './pipes/course-category-image-validation.pipe.js';
let CourseCategoryController = class CourseCategoryController {
    courseCategoryService;
    constructor(courseCategoryService) {
        this.courseCategoryService = courseCategoryService;
    }
    async getPublic() {
        const categories = await this.courseCategoryService.getPublicCategories();
        return ApiResponse.success(categories, 'Lấy danh sách danh mục thành công');
    }
    async getAdmin(query) {
        const categories = await this.courseCategoryService.getAdminCategories(query);
        return ApiResponse.success(categories, 'Lấy danh sách danh mục thành công');
    }
    async create(dto) {
        const category = await this.courseCategoryService.createCategory(dto);
        return ApiResponse.success(category, 'Tạo danh mục thành công');
    }
    async update(id, dto) {
        const category = await this.courseCategoryService.updateCategory(id, dto);
        return ApiResponse.success(category, 'Cập nhật danh mục thành công');
    }
    async uploadImage(id, file) {
        const category = await this.courseCategoryService.uploadImage(id, file);
        return ApiResponse.success(category, 'Cập nhật ảnh danh mục thành công');
    }
    async remove(id) {
        await this.courseCategoryService.deleteCategory(id);
        return ApiResponse.success(null, 'Xóa danh mục thành công');
    }
};
__decorate([
    Get(),
    Public(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CourseCategoryController.prototype, "getPublic", null);
__decorate([
    Get('admin'),
    Roles(RoleEnum.ADMIN),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryCourseCategoriesDto]),
    __metadata("design:returntype", Promise)
], CourseCategoryController.prototype, "getAdmin", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    Roles(RoleEnum.ADMIN),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCourseCategoryDto]),
    __metadata("design:returntype", Promise)
], CourseCategoryController.prototype, "create", null);
__decorate([
    Patch(':id'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateCourseCategoryDto]),
    __metadata("design:returntype", Promise)
], CourseCategoryController.prototype, "update", null);
__decorate([
    Patch(':id/image'),
    Roles(RoleEnum.ADMIN),
    UseInterceptors(FileInterceptor('file')),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, UploadedFile(CourseCategoryImageValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CourseCategoryController.prototype, "uploadImage", null);
__decorate([
    Delete(':id'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CourseCategoryController.prototype, "remove", null);
CourseCategoryController = __decorate([
    Controller('course-categories'),
    __metadata("design:paramtypes", [CourseCategoryService])
], CourseCategoryController);
export { CourseCategoryController };
//# sourceMappingURL=course-category.controller.js.map