export declare class LessonMindmapNodeDto {
    id: string;
    title: string;
    timestamp: number;
    children?: LessonMindmapNodeDto[];
}
export declare class LessonMindmapDataDto {
    root: LessonMindmapNodeDto;
}
export declare class UpdateLessonMindmapDto {
    mindmap: LessonMindmapDataDto;
}
