import { Inject, Injectable } from '@nestjs/common';
import type {
  PublicCourseSearchFilters,
  PublicCourseSearchResult,
} from '../interfaces/public-course-search.interface.js';
import { PublicCourseSearchRepository } from '../repositories/public-course-search.repository.js';

@Injectable()
export class PublicCourseSearchService {
  constructor(
    @Inject(PublicCourseSearchRepository)
    private readonly repository: PublicCourseSearchRepository,
  ) {}

  async search(
    filters: PublicCourseSearchFilters,
  ): Promise<PublicCourseSearchResult> {
    const { items, total } = await this.repository.search(filters);
    return {
      filtersApplied: { ...filters },
      items,
      currency: 'VND',
      total,
      page: filters.page,
      limit: filters.limit,
      hasMore: filters.page * filters.limit < total,
    };
  }
}
