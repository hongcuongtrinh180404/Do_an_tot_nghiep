import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token cannot be empty' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  refreshToken: string;
}
