import { IsOptional, IsInt, Min, Max, IsBoolean, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationOptions, SortOption } from './pagination-result.dto.js';

export class PaginationParamsDto implements PaginationOptions {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return true;
  })
  @IsBoolean()
  isPagination: boolean = true;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed) as SortOption[];
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return Array.isArray(value) ? (value as SortOption[]) : undefined;
  })
  sort?: SortOption[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        return JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    }
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
  })
  filters?: Record<string, unknown>;
}
