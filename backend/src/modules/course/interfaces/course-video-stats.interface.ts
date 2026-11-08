export interface CourseVideoStats {
  courseId: string;
  totalSeconds: number;
  videoCount: number;
  missingDurationCount: number;
  videos: { lessonId: string; url: string; durationSeconds?: number | null }[];
}
