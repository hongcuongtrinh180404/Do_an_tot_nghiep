import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import { PublicCourseSearchService as SearchService } from '../../course/services/public-course-search.service.js';
import type { PublicCourseSearchRepository } from '../../course/repositories/public-course-search.repository.js';
import { SearchCoursesTool } from '../tools/search-courses.tool.js';
import { SearchCoursesError } from '../tools/search-courses.contract.js';

describe('SearchCoursesTool', () => {
  let search: ReturnType<typeof vi.fn>;
  let tool: SearchCoursesTool;

  beforeEach(() => {
    search = vi.fn().mockResolvedValue({ items: [], total: 0 });
    tool = new SearchCoursesTool({
      search,
    } as unknown as PublicCourseSearchService);
  });

  it('validates the entire filter object before calling the read-only service', async () => {
    await tool.execute(
      '{"keyword":"Python","level":"beginner","maxPrice":500000}',
    );
    expect(search).toHaveBeenCalledExactlyOnceWith({
      keyword: 'Python',
      level: 'beginner',
      maxPrice: 500000,
      maxPriceExclusive: false,
      page: 1,
      limit: 5,
    });
  });

  it('rejects invalid or contradictory arguments without touching the database', async () => {
    await expect(
      tool.execute('{"isFree":true,"minPrice":1}'),
    ).rejects.toMatchObject({
      code: 'CHATBOT_TOOL_ARGUMENTS_INVALID',
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('sanitizes all database failures without treating them as an empty result', async () => {
    search.mockRejectedValue(new Error('private-database-credentials'));
    const error: unknown = await tool
      .execute('{}')
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(SearchCoursesError);
    expect(error).toMatchObject({ code: 'CHATBOT_SEARCH_UNAVAILABLE' });
    expect(String(error) + JSON.stringify(error)).not.toContain(
      'private-database-credentials',
    );
    expect(error).not.toHaveProperty('cause');
  });

  it('does not start a cancelled search', async () => {
    await expect(tool.execute('{}', AbortSignal.abort())).rejects.toMatchObject(
      { code: 'CHATBOT_CANCELLED' },
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('drops the result if cancellation occurred during a query', async () => {
    const controller = new AbortController();
    search.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ items: [], total: 0 });
    });
    await expect(tool.execute('{}', controller.signal)).rejects.toMatchObject({
      code: 'CHATBOT_CANCELLED',
    });
  });

  it('returns metadata for bounded pagination without mutating filters or exposing extra repository fields', async () => {
    const repository = {
      search: vi
        .fn()
        .mockResolvedValue({ items: [], total: 12, secret: 'not-public' }),
    };
    const service = new SearchService(
      repository as unknown as PublicCourseSearchRepository,
    );
    const actualTool = new SearchCoursesTool(service);
    const result = await actualTool.execute('{"page":2,"limit":5}');
    expect(result).toEqual({
      filtersApplied: { page: 2, limit: 5, maxPriceExclusive: false },
      items: [],
      currency: 'VND',
      total: 12,
      page: 2,
      limit: 5,
      hasMore: true,
    });
    expect(repository.search).toHaveBeenCalledOnce();
  });
});
