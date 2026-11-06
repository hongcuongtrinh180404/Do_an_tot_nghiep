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

function mapCourseToPublicCard(course: ICourse): IPublicCourseCard {
  const instructorName = course.instructor?.fullName || 'Giảng viên Mindly';
  const instructorAvatar =
    course.instructor?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
  const categoryName = course.category?.name || 'Công nghệ thông tin';
  const categorySlug = course.category?.slug || 'cong-nghe-thong-tin';

  return {
    ...course,
    instructorName,
    instructorTitle: 'Chuyên gia giảng dạy',
    instructorAvatar,
    rating: 5.0,
    reviewCount: 1,
    studentCount: 1,
    durationFormatted: 'Nhiều bài học',
    lessonsCount: 1,
    categorySlug,
    categoryName,
    isFeatured: true,
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
