import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { IForgotPasswordPayload } from 'share-lib';

export class ForgotPasswordDto implements IForgotPasswordPayload {
  @IsNotEmpty({ message: 'Địa chỉ email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;
}
