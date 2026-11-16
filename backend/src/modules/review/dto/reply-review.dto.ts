import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IReplyReviewPayload } from 'share-lib';

export class ReplyReviewDto implements IReplyReviewPayload {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Nội dung phản hồi phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Nội dung phản hồi không được để trống' })
  @MaxLength(2000, { message: 'Nội dung phản hồi tối đa 2000 ký tự' })
  reply: string;
}
