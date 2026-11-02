import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class MoveMergeLessonQuizzesDto {
  @IsNotEmpty({ message: 'Mốc thời gian nguồn không được để trống' })
  @IsNumber({}, { message: 'Mốc thời gian nguồn phải là số giây' })
  @Min(0, { message: 'Mốc thời gian nguồn không được âm' })
  sourceTimestamp: number;

  @IsNotEmpty({ message: 'Mốc thời gian đích không được để trống' })
  @IsNumber({}, { message: 'Mốc thời gian đích phải là số giây' })
  @Min(0, { message: 'Mốc thời gian đích không được âm' })
  targetTimestamp: number;
}

