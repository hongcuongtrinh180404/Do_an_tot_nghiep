import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateCourseCategoryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Tên danh mục phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên danh mục không được vượt quá 100 ký tự' })
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang (kebab-case)',
  })
  slug?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Mô tả danh mục phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Mô tả danh mục không được vượt quá 500 ký tự' })
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự danh mục phải là số nguyên' })
  @Min(0, { message: 'Thứ tự danh mục phải lớn hơn hoặc bằng 0' })
  order?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'Trạng thái hiển thị phải là boolean' })
  isActive?: boolean;
}
