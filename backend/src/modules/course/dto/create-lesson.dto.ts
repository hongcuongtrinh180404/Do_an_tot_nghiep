import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsUrl,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LessonContentTypeEnum } from 'share-lib';

export class LessonContentDto {
  @IsNotEmpty({ message: 'Loại nội dung bài học không được để trống' })
  @IsEnum(LessonContentTypeEnum, {
    message: 'Loại nội dung bài học phải là video hoặc document',
  })
  type: LessonContentTypeEnum;

  @IsNotEmpty({ message: 'URL nội dung không được để trống' })
  @IsUrl({}, { message: 'URL nội dung phải là một URL hợp lệ' })
  url: string;

  @IsOptional()
  @IsString({ message: 'publicId phải là chuỗi ký tự' })
  publicId?: string;

  @IsOptional()
  @IsString({ message: 'fileName phải là chuỗi ký tự' })
  fileName?: string;

  @IsOptional()
  @IsInt({ message: 'fileSize phải là số nguyên' })
  @Min(0, { message: 'fileSize không được là số âm' })
  fileSize?: number;

  @IsOptional()
  @IsString({ message: 'mimeType phải là chuỗi ký tự' })
  mimeType?: string;

  @IsOptional()
  @IsNumber({}, { message: 'duration phải là một số hợp lệ' })
  @Min(0, { message: 'duration không được là số âm' })
  duration?: number;
}

export class CreateLessonDto {
  @IsNotEmpty({ message: 'Tiêu đề bài học không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Tiêu đề bài học phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tiêu đề bài học không được để trống' })
  @MaxLength(200, { message: 'Tiêu đề bài học không được vượt quá 200 ký tự' })
  title: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Mô tả bài học phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Mô tả bài học không được vượt quá 1000 ký tự' })
  description?: string;

  @IsNotEmpty({ message: 'Thứ tự bài học không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự bài học phải là số nguyên' })
  @Min(0, { message: 'Thứ tự bài học phải lớn hơn hoặc bằng 0' })
  order: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LessonContentDto)
  content?: LessonContentDto | null;

  @IsOptional()
  @IsBoolean({ message: 'isPreview phải là giá trị boolean' })
  isPreview?: boolean;
}
