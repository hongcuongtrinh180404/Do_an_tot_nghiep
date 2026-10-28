import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GoogleAuthDto {
  @IsNotEmpty({ message: 'Google ID token không được để trống' })
  @IsString({ message: 'Google ID token phải là chuỗi hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  idToken: string;
}
