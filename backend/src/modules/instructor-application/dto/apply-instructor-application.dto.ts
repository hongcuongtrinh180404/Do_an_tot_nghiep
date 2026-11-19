import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ApplyInstructorApplicationDto {
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  phone: string;

  @IsArray({ message: 'Lĩnh vực chuyên môn phải là danh sách mảng' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 lĩnh vực chuyên môn' })
  @IsString({ each: true, message: 'Mỗi lĩnh vực chuyên môn phải là chuỗi ký tự' })
  expertises: string[];

  @IsNotEmpty({ message: 'Tiểu sử chuyên môn không được để trống' })
  @IsString({ message: 'Tiểu sử chuyên môn phải là chuỗi ký tự' })
  @MinLength(10, { message: 'Tiểu sử chuyên môn phải có ít nhất 10 ký tự' })
  @MaxLength(2000, { message: 'Tiểu sử chuyên môn không được vượt quá 2000 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  bio: string;

  @IsNotEmpty({ message: 'Kinh nghiệm giảng dạy & đào tạo không được để trống' })
  @IsString({ message: 'Kinh nghiệm giảng dạy phải là chuỗi ký tự' })
  @MinLength(10, { message: 'Kinh nghiệm giảng dạy phải có ít nhất 10 ký tự' })
  @MaxLength(2000, { message: 'Kinh nghiệm giảng dạy không được vượt quá 2000 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  experience: string;

  @IsOptional()
  @IsString({ message: 'Tên file CV phải là chuỗi ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  cvFileName?: string;

  @IsOptional()
  @IsString({ message: 'Đường dẫn file CV phải là chuỗi ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  cvFileUrl?: string;
}
