import { IsOptional, IsString, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { IUpdateLessonPayload } from 'share-lib';

export class UpdateLessonDto implements IUpdateLessonPayload {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Tiêu đề bài học phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tiêu đề bài học không được để trống' })
  @MaxLength(200, { message: 'Tiêu đề bài học không được vượt quá 200 ký tự' })
  title?: string;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái học thử phải là boolean' })
  isPreview?: boolean;
}
