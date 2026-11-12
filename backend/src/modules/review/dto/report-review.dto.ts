import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IReportReviewPayload } from 'share-lib';

export class ReportReviewDto implements IReportReviewPayload {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Lý do báo cáo vi phạm là bắt buộc' })
  @IsString({ message: 'Lý do báo cáo phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do báo cáo tối đa 500 ký tự' })
  reason: string;
}

