import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuizQuestionTypeEnum } from 'share-lib';

export class QuizOptionDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  id: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  label: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class QuizQuestionItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  question: string;

  @IsEnum(QuizQuestionTypeEnum)
  questionType: QuizQuestionTypeEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options: QuizOptionDto[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  explanation?: string | null;
}

export class SyncLessonQuizzesAtTimestampDto {
  @IsNumber()
  @Min(0)
  timestamp: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionItemDto)
  @Transform(({ value, obj }) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(obj?.quizzes)) return obj.quizzes;
    return value;
  })
  questions: QuizQuestionItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionItemDto)
  quizzes?: QuizQuestionItemDto[];
}
