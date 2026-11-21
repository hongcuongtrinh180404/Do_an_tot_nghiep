export interface CourseVideoStats {
    courseId: string;
    totalSeconds: number;
    videoCount: number;
    missingDurationCount: number;
    videos: {
        lessonId: string;
        url: string;
        publicId?: string | null;
        durationSeconds?: number | null;
    }[];
}
