import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateSocialLinksDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Facebook link phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Facebook link không được vượt quá 255 ký tự' })
  facebook?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'YouTube link phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'YouTube link không được vượt quá 255 ký tự' })
  youtube?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'LinkedIn link phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'LinkedIn link không được vượt quá 255 ký tự' })
  linkedin?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'GitHub link phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'GitHub link không được vượt quá 255 ký tự' })
  github?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Bio phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Bio không được vượt quá 500 ký tự' })
  bio?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Tên không được vượt quá 50 ký tự' })
  firstName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Họ và tên đệm phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Họ và tên đệm không được vượt quá 50 ký tự' })
  lastName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSocialLinksDto)
  socialLinks?: UpdateSocialLinksDto;
}
