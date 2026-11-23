import { CourseLevelEnum, type ICourse, type IApiResponse } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import type { IPublicCourseCard } from '../types/public-course.types';

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

export type IInstructorPublicCoursesResult = Pick<IPublicCoursesResult, 'items' | 'total'>;

export function formatCourseDuration(totalSeconds?: number | null, lessonsCount?: number | null): string {
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

export function mapCourseToPublicCard(
  course: ICourse,
  fallbackDurationMs?: number | null,
): IPublicCourseCard {
  const rawCat = course.categoryId as unknown;
  const categoryName =
    course.category?.name ||
    (rawCat !== null && typeof rawCat === 'object' && 'name' in (rawCat as Record<string, unknown>)
      ? String((rawCat as Record<string, unknown>).name)
      : 'Chuyên môn');
  const categorySlug =
    course.category?.slug ||
    (rawCat !== null && typeof rawCat === 'object' && 'slug' in (rawCat as Record<string, unknown>)
      ? String((rawCat as Record<string, unknown>).slug)
      : '');

  const rawInst = course.instructorId as unknown;
  const instructorName =
    course.instructor?.fullName ||
    (rawInst !== null && typeof rawInst === 'object' && 'fullName' in (rawInst as Record<string, unknown>)
      ? String((rawInst as Record<string, unknown>).fullName)
      : 'Giảng viên Mindly');
  const instructorAvatar =
    course.instructor?.avatarUrl ||
    (rawInst !== null && typeof rawInst === 'object' && 'avatarUrl' in (rawInst as Record<string, unknown>)
      ? String((rawInst as Record<string, unknown>).avatarUrl || '')
      : '');

  const studentCount = course.studentsCount ?? 0;
  const rating = course.ratingAvg ?? 0;
  const reviewCount = course.reviewCount ?? 0;
  const lessonsCount = course.lessonsCount ?? 0;
  const isFeatured = studentCount >= 5 || (reviewCount > 0 && rating >= 4.5);

  const durationSec =
    course.totalDuration && course.totalDuration > 0
      ? course.totalDuration
      : fallbackDurationMs && fallbackDurationMs > 0
        ? Math.round(fallbackDurationMs / 1000)
        : 0;

  return {
    ...course,
    thumbnailUrl: course.thumbnailUrl || '',
    instructorName,
    instructorTitle: 'Chuyên gia giảng dạy',
    instructorAvatar,
    rating,
    reviewCount,
    studentCount,
    durationFormatted: formatCourseDuration(durationSec, lessonsCount),
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

  const queryParams: Record<string, string | number> = { page, limit };

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
  if (!data || !Array.isArray(data.items)) {
    throw new Error('Dữ liệu danh sách khóa học không hợp lệ');
  }

  return {
    items: data.items.map(mapCourseToPublicCard),
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
  };
}

/** Fetch every page so instructor totals are never based on only the first 12 courses. */
export async function fetchInstructorPublicCourses(
  instructorId: string,
): Promise<IInstructorPublicCoursesResult> {
  const firstPage = await fetchPublicCourses({ instructorId, page: 1, limit: 100 });
  const courses = new Map(firstPage.items.map((course) => [course.id, course]));

  for (let page = 2; page <= firstPage.totalPages; page++) {
    const result = await fetchPublicCourses({ instructorId, page, limit: 100 });
    for (const course of result.items) courses.set(course.id, course);
  }

  return {
    total: firstPage.total,
    items: [...courses.values()],
  };
}
