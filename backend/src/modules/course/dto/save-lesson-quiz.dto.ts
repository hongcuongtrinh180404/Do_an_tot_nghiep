import { IsInt, Min, ValidateIf } from 'class-validator';
import type { ISaveLessonQuizPayload } from 'share-lib';
import { QuizQuestionContentDto } from './sync-lesson-quizzes.dto.js';

export class SaveLessonQuizDto extends QuizQuestionContentDto implements ISaveLessonQuizPayload {
  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @Min(0)
  timestamp: number | null;
}

export class UpdateQuizTimestampDto {
  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @Min(0)
  timestamp: number | null;
}
