import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ICreateReviewPayload } from 'share-lib';

export class CreateReviewDto implements ICreateReviewPayload {
  @IsInt({ message: 'Số sao đánh giá phải là số nguyên' })
  @Min(1, { message: 'Số sao tối thiểu là 1' })
  @Max(5, { message: 'Số sao tối đa là 5' })
  rating: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  })
  @IsString({ message: 'Nội dung nhận xét phải là chuỗi ký tự' })
  @MaxLength(2000, { message: 'Nội dung nhận xét tối đa 2000 ký tự' })
  comment?: string | null;
}

