import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyEmailChangeDto {
  @IsString({ message: 'Mã xác nhận phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã xác nhận không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  token: string;
}

