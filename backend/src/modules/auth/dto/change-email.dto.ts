import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { AUTH_CONSTANTS } from 'share-lib';

export class ChangeEmailRequestDto {
  @IsEmail({}, { message: 'Địa chỉ email mới không đúng định dạng' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  newEmail: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  @MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
    message: `Mật khẩu phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
  })
  currentPassword: string;
}

