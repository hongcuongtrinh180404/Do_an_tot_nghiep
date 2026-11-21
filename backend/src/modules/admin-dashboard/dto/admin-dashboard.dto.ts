import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn([
    'today',
    'yesterday',
    '7d',
    '7days',
    '30d',
    '30days',
    'this_month',
    'thismonth',
    'last_month',
    'lastmonth',
    'this_year',
    'thisyear',
    'custom',
    'all',
  ])
  period?: string = 'this_month';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  startDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  endDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['day', 'month'])
  groupBy?: 'day' | 'month';
}

export class AdminCoursesPerformanceQueryDto extends AdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categoryId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  instructorId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['revenue', 'enrollment', 'completion'])
  tab?: 'revenue' | 'enrollment' | 'completion';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

export class AdminInstructorsRankingQueryDto extends AdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim().toLowerCase();
    if (v === 'grossrevenue' || v === 'gross_revenue') return 'grossRevenue';
    if (v === 'salescount' || v === 'sales_count') return 'salesCount';
    if (v === 'netrevenue' || v === 'net_revenue') return 'netRevenue';
    return value.trim();
  })
  @IsIn(['grossRevenue', 'salesCount', 'netRevenue'])
  sortBy?: 'grossRevenue' | 'salesCount' | 'netRevenue' = 'grossRevenue';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 5;
}
