import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AUTH_CONSTANTS } from 'share-lib';

export class ChangePasswordDto {
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  currentPassword: string;

  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
    message: `Mật khẩu mới phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
  })
  newPassword: string;

  @IsString({ message: 'Xác nhận mật khẩu mới phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu mới không được để trống' })
  @MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
    message: `Xác nhận mật khẩu mới phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
  })
  confirmPassword: string;
}

