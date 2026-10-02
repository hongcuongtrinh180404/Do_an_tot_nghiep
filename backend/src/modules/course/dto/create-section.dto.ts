import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSectionDto {
  @IsNotEmpty({ message: 'Tiêu đề chương học không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Tiêu đề chương học phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tiêu đề chương học không được để trống' })
  @MaxLength(200, { message: 'Tiêu đề chương học không được vượt quá 200 ký tự' })
  title: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Mô tả chương học phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Mô tả chương học không được vượt quá 1000 ký tự' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự chương học phải là số nguyên' })
  @Min(0, { message: 'Thứ tự chương học phải lớn hơn hoặc bằng 0' })
  order?: number;
}
