import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RejectCourseDto {
  @IsString({ message: 'Lý do yêu cầu chỉnh sửa phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa' })
  @MinLength(10, { message: 'Lý do yêu cầu chỉnh sửa phải có ít nhất 10 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason: string;
}

