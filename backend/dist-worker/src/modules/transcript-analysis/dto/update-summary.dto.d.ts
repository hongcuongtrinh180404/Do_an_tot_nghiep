export declare class LessonSummaryKeyPointDto {
    title: string;
    content: string;
    timestamp?: number;
}
export declare class UpdateLessonSummaryDto {
    title: string;
    overview: string;
    keyPoints: LessonSummaryKeyPointDto[];
}
