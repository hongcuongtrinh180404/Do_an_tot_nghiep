import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class LessonSummaryKeyPointDto {
  @IsNotEmpty({ message: 'Tiêu đề ý chính không được để trống' })
  @IsString({ message: 'Tiêu đề ý chính phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsNotEmpty({ message: 'Nội dung ý chính không được để trống' })
  @IsString({ message: 'Nội dung ý chính phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content: string;

  @IsOptional()
  @IsNumber({}, { message: 'Mốc thời gian phải là số nguyên giây hợp lệ' })
  @Min(0, { message: 'Mốc thời gian không được âm' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  timestamp?: number;
}

export class UpdateLessonSummaryDto {
  @IsNotEmpty({ message: 'Tiêu đề tóm tắt không được để trống' })
  @IsString({ message: 'Tiêu đề tóm tắt phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsNotEmpty({ message: 'Nội dung tổng quan không được để trống' })
  @IsString({ message: 'Nội dung tổng quan phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  overview: string;

  @IsArray({ message: 'Danh sách ý chính phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => LessonSummaryKeyPointDto)
  keyPoints: LessonSummaryKeyPointDto[];
}
