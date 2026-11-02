import { CourseLevelEnum } from 'share-lib';
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

/**
 * Normalizes Vietnamese string for resilient search matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Service boundary for public courses catalog.
 * Currently backed by verified rich mock data.
 * When backend GET /api/v1/courses is ready, this function can be swapped to an HTTP call
 * without changing any UI consumer components.
 */
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

  // Filter in-memory
  let filtered = MOCK_PUBLIC_COURSES.filter((course) => {
    // 1. Text search matching title, instructor name, and description
    if (q.trim()) {
      const normalizedQuery = normalizeText(q);
      const titleMatch = normalizeText(course.title).includes(normalizedQuery);
      const instructorMatch = normalizeText(course.instructorName).includes(normalizedQuery);
      const descMatch = course.shortDescription
        ? normalizeText(course.shortDescription).includes(normalizedQuery)
        : false;

      if (!titleMatch && !instructorMatch && !descMatch) {
        return false;
      }
    }

    // 2. Categories filter (multi-select OR logic within categories)
    if (categories.length > 0) {
      if (!categories.includes(course.categorySlug)) {
        return false;
      }
    }

    // 3. Price ranges filter (multi-select OR logic across selected ranges)
    if (priceRanges.length > 0) {
      const matchesPrice = priceRanges.some((range) => {
        switch (range) {
          case 'free':
            return course.price === 0;
          case 'under-200':
            return course.price > 0 && course.price < 200000;
          case '200-500':
            return course.price >= 200000 && course.price < 500000;
          case 'above-500':
            return course.price >= 500000;
          case 'discount':
            return Boolean(course.originalPrice && course.originalPrice > course.price);
          default:
            return false;
        }
      });

      if (!matchesPrice) {
        return false;
      }
    }

    // 4. Levels filter (multi-select OR logic across selected levels)
    if (levels.length > 0) {
      if (!levels.includes(course.level)) {
        return false;
      }
    }

    return true;
  });

  // Sort logic
  filtered = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'rating':
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.reviewCount - a.reviewCount;

      case 'popular':
        return b.studentCount - a.studentCount;

      case 'price-asc':
        return a.price - b.price;

      case 'price-desc':
        return b.price - a.price;

      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const items = total === 0 ? [] : filtered.slice(startIndex, startIndex + limit);

  return {
    items,
    total,
    page: currentPage,
    limit,
    totalPages,
  };
}

