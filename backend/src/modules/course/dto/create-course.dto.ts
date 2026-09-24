import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CourseLevelEnum } from 'share-lib';

export class CreateCourseDto {
  @IsNotEmpty({ message: 'Tiêu đề khóa học không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Tiêu đề khóa học phải là chuỗi ký tự' })
  @MinLength(3, { message: 'Tiêu đề khóa học phải có ít nhất 3 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề khóa học không được vượt quá 200 ký tự' })
  title: string;

  @IsNotEmpty({ message: 'Đường dẫn tĩnh (slug) không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString({ message: 'Đường dẫn tĩnh (slug) phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang (kebab-case)',
  })
  slug: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Mô tả ngắn phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Mô tả ngắn không được vượt quá 500 ký tự' })
  shortDescription?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Mô tả chi tiết phải là chuỗi ký tự' })
  description?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Đường dẫn ảnh đại diện phải là chuỗi ký tự' })
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá khóa học phải là số' })
  @Min(0, { message: 'Giá khóa học phải lớn hơn hoặc bằng 0' })
  price?: number;

  @IsOptional()
  @IsEnum(CourseLevelEnum, {
    message: `Cấp độ khóa học không hợp lệ. Các giá trị hợp lệ: ${Object.values(CourseLevelEnum).join(', ')}`,
  })
  level?: CourseLevelEnum;
}
