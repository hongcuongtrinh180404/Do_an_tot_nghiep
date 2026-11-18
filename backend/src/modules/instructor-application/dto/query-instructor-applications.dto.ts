import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { InstructorApplicationStatusEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/index.js';

export enum InstructorApplicationTabEnum {
  PENDING = 'PENDING',
  HISTORY = 'HISTORY',
}

export class QueryInstructorApplicationsDto extends PaginationParamsDto {
  @IsOptional()
  @IsEnum(InstructorApplicationTabEnum)
  tab?: InstructorApplicationTabEnum;

  @IsOptional()
  @IsEnum(InstructorApplicationStatusEnum)
  status?: InstructorApplicationStatusEnum;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  search?: string;
}
