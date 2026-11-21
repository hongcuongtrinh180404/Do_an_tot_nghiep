import type { ISaveLessonQuizPayload } from 'share-lib';
import { QuizQuestionContentDto } from './sync-lesson-quizzes.dto.js';
export declare class SaveLessonQuizDto extends QuizQuestionContentDto implements ISaveLessonQuizPayload {
    timestamp: number | null;
}
export declare class UpdateQuizTimestampDto {
    timestamp: number | null;
}
