import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendVerificationDto {
  @IsNotEmpty({ message: 'Địa chỉ email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;
}
