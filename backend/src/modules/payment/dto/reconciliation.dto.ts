import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class ReconciliationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ReprocessPaymentDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^MD(?:[A-Z0-9]{10}|\d{5})$/)
  orderCode?: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(5)
  @MaxLength(1000)
  note: string;
}

export class ResolvePaymentDto {
  @IsIn(['ACKNOWLEDGED', 'REFUNDED'])
  type: 'ACKNOWLEDGED' | 'REFUNDED';

  @IsString()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(5)
  @MaxLength(1000)
  note: string;

  @ValidateIf((dto: ResolvePaymentDto) => dto.type === 'REFUNDED' || dto.bankReference !== undefined)
  @IsString()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(3)
  @MaxLength(128)
  bankReference?: string;

  @ValidateIf((dto: ResolvePaymentDto) => dto.type === 'REFUNDED' || dto.refundedAmount !== undefined)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  refundedAmount?: number;
}
