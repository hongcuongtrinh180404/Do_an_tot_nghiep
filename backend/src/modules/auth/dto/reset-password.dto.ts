import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IResetPasswordPayload } from 'share-lib';

export class ResetPasswordDto implements IResetPasswordPayload {
  @IsNotEmpty({ message: 'Token đặt lại mật khẩu không được để trống' })
  @IsString({ message: 'Token đặt lại mật khẩu phải là chuỗi hợp lệ' })
  @Length(64, 64, { message: 'Token đặt lại mật khẩu không hợp lệ' })
  @Matches(/^[a-f0-9]+$/i, { message: 'Token đặt lại mật khẩu không hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  password: string;
}
