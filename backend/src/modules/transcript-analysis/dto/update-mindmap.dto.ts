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

export class LessonMindmapNodeDto {
  @IsNotEmpty({ message: 'ID của node không được để trống' })
  @IsString({ message: 'ID của node phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  id: string;

  @IsNotEmpty({ message: 'Tiêu đề của node không được để trống' })
  @IsString({ message: 'Tiêu đề của node phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsNumber({}, { message: 'Timestamp phải là số giây hợp lệ' })
  @Min(0, { message: 'Timestamp không được âm' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? value : Math.max(0, Math.floor(num));
  })
  timestamp: number;

  @IsOptional()
  @IsArray({ message: 'Danh sách node con phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => LessonMindmapNodeDto)
  @Transform(({ value }) => (value === null ? undefined : value))
  children?: LessonMindmapNodeDto[];
}

export class LessonMindmapDataDto {
  @ValidateNested()
  @Type(() => LessonMindmapNodeDto)
  root: LessonMindmapNodeDto;
}

export class UpdateLessonMindmapDto {
  @ValidateNested()
  @Type(() => LessonMindmapDataDto)
  mindmap: LessonMindmapDataDto;
}
