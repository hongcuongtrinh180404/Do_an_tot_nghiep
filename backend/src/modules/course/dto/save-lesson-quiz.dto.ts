import { IsInt, Min } from 'class-validator';
import type { ISaveLessonQuizPayload } from 'share-lib';
import { QuizQuestionContentDto } from './sync-lesson-quizzes.dto.js';

export class SaveLessonQuizDto extends QuizQuestionContentDto implements ISaveLessonQuizPayload {
  @IsInt()
  @Min(0)
  timestamp: number;
}
