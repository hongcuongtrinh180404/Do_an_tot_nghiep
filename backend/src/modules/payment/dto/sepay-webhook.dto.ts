import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SepayWebhookDto {
  @IsNotEmpty({ message: 'id giao dịch SePay không được để trống' })
  id: number | string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsNotEmpty({ message: 'accountNumber không được để trống' })
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsNotEmpty({ message: 'content không được để trống' })
  @IsString()
  content: string;

  @IsNotEmpty({ message: 'transferType không được để trống' })
  @IsString()
  transferType: string;

  @IsNotEmpty({ message: 'transferAmount không được để trống' })
  @IsNumber({}, { message: 'transferAmount phải là số' })
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

