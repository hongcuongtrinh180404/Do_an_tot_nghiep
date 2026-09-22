import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Tên không được vượt quá 50 ký tự' })
  firstName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Họ và tên đệm phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Họ và tên đệm không được vượt quá 50 ký tự' })
  lastName?: string;
}
