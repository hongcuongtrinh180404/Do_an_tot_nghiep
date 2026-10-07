import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum, type IUserProfile } from 'share-lib';
import { ApiResponse, PaginationResult } from '../base/index.js';
import { MAX_AVATAR_SIZE_BYTES } from '../storage/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserService } from './services/user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query() query: QueryUsersDto,
  ): Promise<ApiResponse<PaginationResult<IUserProfile>>> {
    const result = await this.userService.findUsersWithPagination(query);
    return ApiResponse.success(result, 'Lấy danh sách người dùng thành công');
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<IUserProfile>> {
    const profile = await this.userService.getProfile(userId);
    return ApiResponse.success(profile, 'Lấy thông tin tài khoản thành công');
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<IUserProfile>> {
    const profile = await this.userService.updateProfile(userId, dto);
    return ApiResponse.success(profile, 'Cập nhật thông tin tài khoản thành công');
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_AVATAR_SIZE_BYTES,
            message: 'Dung lượng ảnh tối đa là 50MB',
          }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp|gif)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ApiResponse<{ avatar: string; user: IUserProfile }>> {
    const result = await this.userService.updateAvatar(userId, file);
    return ApiResponse.success(result, 'Tải lên ảnh đại diện thành công');
  }

  @Get(':id')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserDetail(
    @Param('id') userId: string,
  ): Promise<ApiResponse<IUserProfile>> {
    const profile = await this.userService.getUserDetail(userId);
    return ApiResponse.success(profile, 'Lấy thông tin người dùng thành công');
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUserAdmin(
    @Param('id') userId: string,
    @Body() dto: UpdateUserAdminDto,
  ): Promise<ApiResponse<IUserProfile>> {
    const profile = await this.userService.updateUserAdmin(userId, dto);
    return ApiResponse.success(profile, 'Cập nhật thông tin người dùng thành công');
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') userId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.userService.softDelete(userId);
    return ApiResponse.success({ deleted: true }, 'Xóa người dùng thành công');
  }
}
