import type { CourseLevelEnum } from 'share-lib';
export interface PublicCourseSearchFilters {
    keyword?: string;
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
