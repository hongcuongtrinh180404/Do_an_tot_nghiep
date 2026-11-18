import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TermItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty({ message: 'Tiêu đề điều khoản không được để trống' })
  @IsString({ message: 'Tiêu đề điều khoản phải là chuỗi ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title: string;

  @IsNotEmpty({ message: 'Nội dung điều khoản không được để trống' })
  @IsString({ message: 'Nội dung điều khoản phải là chuỗi ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  content: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateInstructorTermsDto {
  @IsArray({ message: 'Danh sách điều khoản phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => TermItemDto)
  terms: TermItemDto[];
}
