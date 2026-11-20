import type { CourseLevelEnum } from 'share-lib';

/** Normalized, server-validated filters. Prices are integer VND. */
export interface PublicCourseSearchFilters {
  keyword?: string;
  /** AI-expanded alternatives for a broad learning goal; never relax non-topic filters. */
  relatedKeywords?: readonly string[];
  minPrice?: number;
  maxPrice?: number;
  maxPriceExclusive: boolean;
  isFree?: boolean;
  level?: CourseLevelEnum;
  page: number;
  limit: number;
}

export interface PublicCourseSearchItem {
  id: string;
  title: string;
  price: number;
  level: CourseLevelEnum;
  categoryName: string | null;
  /** Relative public course link, constructed by the server. */
  url: string;
}

export interface PublicCourseSearchResult {
  filtersApplied: PublicCourseSearchFilters;
  items: PublicCourseSearchItem[];
  currency: 'VND';
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
