import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RevenueTimeRangeQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  timeRange?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  startDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  endDate?: string;
}

export class RevenueTransactionsQueryDto extends RevenueTimeRangeQueryDto {
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

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['newest', 'oldest', 'amount_desc', 'amount_asc'])
  sort?: string = 'newest';
}

export class InstructorsRevenueQueryDto extends RevenueTimeRangeQueryDto {
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

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'revenue_desc',
    'revenue_asc',
    'sales_desc',
    'courses_desc',
    'commission_desc',
    'commission_asc',
  ])
  sort?: string = 'revenue_desc';
}

export class UpdateCommissionConfigDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tỷ lệ hoa hồng phải là số hợp lệ (tối đa 2 chữ số thập phân)' })
  @Min(0, { message: 'Tỷ lệ hoa hồng không được nhỏ hơn 0%' })
  @Max(100, { message: 'Tỷ lệ hoa hồng không được vượt quá 100%' })
  defaultRate: number;

  @IsOptional()
  @IsString({ message: 'Lý do thay đổi hoa hồng phải là chuỗi ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  reason?: string;
}

export class UpdateInstructorCommissionDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tỷ lệ hoa hồng phải là số hợp lệ (tối đa 2 chữ số thập phân)' })
  @Min(0, { message: 'Tỷ lệ hoa hồng không được nhỏ hơn 0%' })
  @Max(100, { message: 'Tỷ lệ hoa hồng không được vượt quá 100%' })
  commissionRate: number;

  @IsString({ message: 'Lý do thay đổi hoa hồng là bắt buộc' })
  @IsNotEmpty({ message: 'Lý do thay đổi hoa hồng không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : '',
  )
  reason: string;
}

