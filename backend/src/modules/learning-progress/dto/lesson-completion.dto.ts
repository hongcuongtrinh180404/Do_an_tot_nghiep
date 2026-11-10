import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsMongoId, IsNumber, IsString, Length, Min } from 'class-validator';
import type { ICompleteLessonVideo, ISubmitLessonQuizAnswer } from 'share-lib';

export class SubmitLessonQuizAnswerDto implements ISubmitLessonQuizAnswer {
  @IsMongoId()
  quizId: string;

  @IsString()
  @Length(64, 64)
  quizRevision: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  selectedOptionIds: string[];
}

export class CompleteLessonVideoDto implements ICompleteLessonVideo {
  @IsString()
  @Length(64, 64)
  mediaVersion: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  positionSeconds: number;
}
