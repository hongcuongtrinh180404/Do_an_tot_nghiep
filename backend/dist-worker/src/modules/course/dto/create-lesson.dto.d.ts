import { LessonContentTypeEnum } from 'share-lib';
export declare class LessonContentDto {
    type: LessonContentTypeEnum;
    url: string;
    publicId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
}
export declare class CreateLessonDto {
    title: string;
    order: number;
    content: LessonContentDto;
    isPreview?: boolean;
}
