import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RevenueTimeRangeQueryDto } from './revenue.dto.js';

export class InstructorCoursesRevenueQueryDto extends RevenueTimeRangeQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['revenue_desc', 'earnings_desc', 'sales_desc'])
  sort?: string = 'revenue_desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
