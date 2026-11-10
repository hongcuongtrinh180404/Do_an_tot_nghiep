import { CourseLevelEnum, type ICourse, type IApiResponse } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import {
  MOCK_PUBLIC_COURSES,
  type IPublicCourseCard,
} from '../components/public-discovery/mock-discovery-data';

export type PublicPriceRange = 'free' | 'under-200' | '200-500' | 'above-500' | 'discount';

export type PublicSortOption = 'newest' | 'rating' | 'popular' | 'price-asc' | 'price-desc';

export interface IPublicCoursesFilterParams {
  q?: string;
  categories?: string[];
  priceRanges?: PublicPriceRange[];
  levels?: CourseLevelEnum[];
  sort?: PublicSortOption;
  instructorId?: string;
  page?: number;
  limit?: number;
}

export interface IPublicCoursesResult {
  items: IPublicCourseCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatCourseDuration(totalSeconds?: number | null, lessonsCount?: number | null): string {
  if (totalSeconds && totalSeconds > 0) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}p`;
    if (hours > 0) return `${hours} giờ`;
    if (minutes > 0) return `${minutes} phút`;
    return `${Math.round(totalSeconds)} giây`;
  }
  if (lessonsCount && lessonsCount > 0) {
    return `${lessonsCount} bài học`;
  }
  return 'Nhiều bài học';
}

function mapCourseToPublicCard(course: ICourse): IPublicCourseCard {
  const instructorName = course.instructor?.fullName || 'Giảng viên Mindly';
  const instructorAvatar = course.instructor?.avatarUrl || '';
  const categoryName = course.category?.name || 'Chuyên môn';
  const categorySlug = course.category?.slug || '';
  const studentCount = course.studentsCount ?? 0;
  const rating = course.ratingAvg ?? 0;
  const reviewCount = course.reviewCount ?? 0;
  const lessonsCount = course.lessonsCount ?? 0;
  const isFeatured = studentCount >= 5 || (reviewCount > 0 && rating >= 4.5);

  return {
    ...course,
    instructorName,
    instructorTitle: 'Chuyên gia giảng dạy',
    instructorAvatar,
    rating,
    reviewCount,
    studentCount,
    durationFormatted: formatCourseDuration(course.totalDuration, course.lessonsCount),
    lessonsCount,
    categorySlug,
    categoryName,
    isFeatured,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
  };
}

export async function fetchPublicCourses(
  params: IPublicCoursesFilterParams = {},
): Promise<IPublicCoursesResult> {
  const {
    q = '',
    categories = [],
    priceRanges = [],
    levels = [],
    sort = 'newest',
    page = 1,
    limit = 9,
  } = params;

  try {
    const queryParams: Record<string, string | number> = {
      page,
      limit,
    };

    if (q.trim()) queryParams.q = q.trim();
    if (categories.length > 0 && categories[0] !== 'all') {
      queryParams.category = categories[0];
    }
    if (levels.length > 0) queryParams.level = levels[0];
    if (priceRanges.length > 0) queryParams.priceRange = priceRanges[0];
    if (sort) queryParams.sort = sort;
    if (params.instructorId) queryParams.instructorId = params.instructorId;

    const res = await apiClient.get<IApiResponse<{
      items: ICourse[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>>('/courses', { params: queryParams });

    const data = res.data?.data;
    if (data && Array.isArray(data.items)) {
      return {
        items: data.items.map(mapCourseToPublicCard),
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      };
    }
  } catch (error) {
    console.warn('Backend /courses API unavailable or error, falling back to mock data:', error);
  }

  // Fallback to local mock data if API is offline
  return {
    items: MOCK_PUBLIC_COURSES.slice(0, limit),
    total: MOCK_PUBLIC_COURSES.length,
    page,
    limit,
    totalPages: Math.ceil(MOCK_PUBLIC_COURSES.length / limit),
  };
}
