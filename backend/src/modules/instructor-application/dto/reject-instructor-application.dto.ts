import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RejectInstructorApplicationDto {
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @MinLength(10, { message: 'Lý do từ chối phải có ít nhất 10 ký tự' })
  @MaxLength(1000, { message: 'Lý do từ chối không được vượt quá 1000 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  rejectionReason: string;
}
