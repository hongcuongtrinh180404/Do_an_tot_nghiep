import { QuizQuestionTypeEnum } from 'share-lib';
export declare class QuizOptionDto {
    id: string;
    label: string;
    text: string;
    isCorrect: boolean;
}
export declare class QuizQuestionContentDto {
    question: string;
    questionType: QuizQuestionTypeEnum;
    options: QuizOptionDto[];
    explanation?: string | null;
    explanationTimestamp?: number | null;
}
export declare class QuizQuestionItemDto extends QuizQuestionContentDto {
    timestamp?: number | null;
    id?: string;
    order: number;
}
export declare class SyncLessonQuizzesAtTimestampDto {
    timestamp: number;
    questions: QuizQuestionItemDto[];
    quizzes?: QuizQuestionItemDto[];
}
