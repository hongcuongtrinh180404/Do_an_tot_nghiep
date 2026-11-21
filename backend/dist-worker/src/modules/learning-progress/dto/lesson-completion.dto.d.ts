import type { ICompleteLessonVideo, ISubmitLessonQuizAnswer } from 'share-lib';
export declare class SubmitLessonQuizAnswerDto implements ISubmitLessonQuizAnswer {
    quizId: string;
    quizRevision: string;
    selectedOptionIds: string[];
}
export declare class CompleteLessonVideoDto implements ICompleteLessonVideo {
    mediaVersion: string;
    positionSeconds: number;
}
