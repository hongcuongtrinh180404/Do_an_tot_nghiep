import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { IUserProfile } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserService } from './services/user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
            maxSize: 5 * 1024 * 1024,
            message: 'Dung lượng ảnh tối đa là 5MB',
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
}
