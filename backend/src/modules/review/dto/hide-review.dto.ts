import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IHideReviewPayload } from 'share-lib';

export class HideReviewDto implements IHideReviewPayload {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Lý do ẩn đánh giá là bắt buộc' })
  @IsString({ message: 'Lý do ẩn đánh giá phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do ẩn đánh giá tối đa 500 ký tự' })
  reason: string;
}

