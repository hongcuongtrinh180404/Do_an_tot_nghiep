import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Token xác thực không được để trống' })
  @IsString({ message: 'Token xác thực phải là chuỗi hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  token: string;
}
