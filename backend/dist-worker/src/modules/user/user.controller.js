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
import { Controller, Get, Patch, Post, Delete, Param, Body, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpCode, HttpStatus, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { MAX_AVATAR_SIZE_BYTES } from '../storage/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { UserService } from './services/user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async getUsers(query) {
        const result = await this.userService.findUsersWithPagination(query);
        return ApiResponse.success(result, 'Lấy danh sách người dùng thành công');
    }
    async getProfile(userId) {
        const profile = await this.userService.getProfile(userId);
        return ApiResponse.success(profile, 'Lấy thông tin tài khoản thành công');
    }
    async updateProfile(userId, dto) {
        const profile = await this.userService.updateProfile(userId, dto);
        return ApiResponse.success(profile, 'Cập nhật thông tin tài khoản thành công');
    }
    async uploadAvatar(userId, file) {
        const result = await this.userService.updateAvatar(userId, file);
        return ApiResponse.success(result, 'Tải lên ảnh đại diện thành công');
    }
    async getPublicProfile(username) {
        const profile = await this.userService.getPublicProfileByUsername(username);
        return ApiResponse.success(profile, 'Lấy hồ sơ công khai thành công');
    }
    async getUserDetail(userId) {
        const profile = await this.userService.getUserDetail(userId);
        return ApiResponse.success(profile, 'Lấy thông tin người dùng thành công');
    }
    async updateUserAdmin(userId, dto) {
        const profile = await this.userService.updateUserAdmin(userId, dto);
        return ApiResponse.success(profile, 'Cập nhật thông tin người dùng thành công');
    }
    async deleteUser(userId) {
        await this.userService.softDelete(userId);
        return ApiResponse.success({ deleted: true }, 'Xóa người dùng thành công');
    }
};
__decorate([
    Get(),
    Roles(RoleEnum.ADMIN),
    HttpCode(HttpStatus.OK),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryUsersDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUsers", null);
__decorate([
    Get('profile'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
__decorate([
    Patch('profile'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateProfile", null);
__decorate([
    Post('avatar'),
    HttpCode(HttpStatus.OK),
    UseInterceptors(FileInterceptor('file')),
    __param(0, CurrentUser('id')),
    __param(1, UploadedFile(new ParseFilePipe({
        validators: [
            new MaxFileSizeValidator({
                maxSize: MAX_AVATAR_SIZE_BYTES,
                message: 'Dung lượng ảnh tối đa là 50MB',
            }),
            new FileTypeValidator({
                fileType: /(jpg|jpeg|png|webp|gif)$/i,
            }),
        ],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "uploadAvatar", null);
__decorate([
    Get('public/:username'),
    Public(),
    HttpCode(HttpStatus.OK),
    __param(0, Param('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getPublicProfile", null);
__decorate([
    Get(':id'),
    Roles(RoleEnum.ADMIN),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserDetail", null);
__decorate([
    Patch(':id'),
    Roles(RoleEnum.ADMIN),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateUserAdminDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUserAdmin", null);
__decorate([
    Delete(':id'),
    Roles(RoleEnum.ADMIN),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUser", null);
UserController = __decorate([
    Controller('users'),
    __metadata("design:paramtypes", [UserService])
], UserController);
export { UserController };
//# sourceMappingURL=user.controller.js.map