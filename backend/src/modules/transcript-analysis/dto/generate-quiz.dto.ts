import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateQuizDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  saveAsDraft?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => {
    if (typeof value === 'string') return parseInt(value, 10);
    return value;
  })
  count?: number = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  targetLanguage?: string = 'vi';
}
