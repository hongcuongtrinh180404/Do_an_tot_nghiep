import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CourseApprovalActionEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/index.js';

export class QueryCourseApprovalHistoryDto extends PaginationParamsDto {
  @IsOptional()
  @IsEnum(CourseApprovalActionEnum)
  action?: CourseApprovalActionEnum;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  courseId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  search?: string;
}
