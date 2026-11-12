import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminDeleteReviewDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  })
  @IsString({ message: 'Lý do xóa phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do xóa tối đa 500 ký tự' })
  reason?: string;
}

