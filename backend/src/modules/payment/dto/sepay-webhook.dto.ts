import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class SepayWebhookDto {
  @IsNotEmpty({ message: 'id giao dịch SePay không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value,
  )
  @IsString()
  @Matches(/^[1-9]\d{0,19}$/)
  id: number | string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsNotEmpty()
  @IsString()
  transactionDate?: string;

  @IsNotEmpty({ message: 'accountNumber không được để trống' })
  @IsString()
  @MaxLength(64)
  accountNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  code?: string | null;

  @IsNotEmpty({ message: 'content không được để trống' })
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsNotEmpty({ message: 'transferType không được để trống' })
  @IsString()
  @IsIn(['in', 'out'])
  transferType: string;

  @IsNotEmpty({ message: 'transferAmount không được để trống' })
  @IsInt({ message: 'transferAmount phải là số nguyên VND' })
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  transferAmount: number;

  @IsOptional()
  @IsNumber()
  accumulated?: number;

  @IsOptional()
  @IsString()
  subAccount?: string | null;

  @IsOptional()
  @IsString()
  referenceCode?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
