import type { ICourse } from 'share-lib';

export interface IPublicCourseCard extends ICourse {
  instructorName: string;
  instructorTitle: string;
  instructorAvatar: string;
  rating: number;
  reviewCount: number;
  studentCount: number;
  durationFormatted: string;
  lessonsCount: number;
  categorySlug: string;
  categoryName: string;
  isFeatured?: boolean;
  aiFeatures: {
    hasMindmap: boolean;
    hasInVideoQuiz: boolean;
    hasTranscript: boolean;
  };
}
