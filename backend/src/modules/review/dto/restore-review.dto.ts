import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IRestoreReviewPayload } from 'share-lib';

export class RestoreReviewDto implements IRestoreReviewPayload {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  })
  @IsString({ message: 'Ghi chú khôi phục phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Ghi chú khôi phục tối đa 500 ký tự' })
  reason?: string;
}

