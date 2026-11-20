import { describe, expect, it } from 'vitest';
import { parseSearchCoursesArguments } from '../tools/search-courses.contract.js';
import {
  ChatbotFollowUpError,
  resolveSearchCoursesArguments,
  type ChatbotSearchContext,
} from '../tools/search-courses.context.js';

const previous: ChatbotSearchContext = {
  filters: parseSearchCoursesArguments(
    JSON.stringify({
      keyword: 'backend',
      relatedKeywords: ['Node.js', 'NestJS'],
      maxPrice: 200000,
      maxPriceExclusive: true,
      isFree: false,
      page: 3,
      limit: 2,
    }),
  ),
  lowestPrice: 50000,
  hasMore: true,
};
const resolve = (
  args: unknown,
  context: ChatbotSearchContext | undefined = previous,
) => resolveSearchCoursesArguments(JSON.stringify(args), context);

describe('Conversation search intent resolution', () => {
  it('inherits unchanged filters and expansions, but resets page when refining', () => {
    expect(resolve({ action: 'refine', level: 'beginner' })).toEqual({
      ...previous.filters,
      level: 'beginner',
      page: 1,
    });
  });
  it('changes free/paid without dropping the topic, budget or level', () => {
    const context = {
      ...previous,
      filters: {
        ...previous.filters,
        minPrice: 20000,
        level: 'beginner' as const,
      },
    };
    const filters = resolve({ action: 'refine', isFree: true }, context);
    expect(filters).toMatchObject({
      keyword: 'backend',
      maxPrice: 200000,
      level: 'beginner',
      isFree: true,
      page: 1,
    });
    expect(filters).not.toHaveProperty('minPrice');
  });
  it('clears only explicitly removed constraints', () => {
    expect(
      resolve({ action: 'refine', clearFilters: ['maxPrice', 'isFree'] }),
    ).toEqual({
      keyword: 'backend',
      relatedKeywords: ['Node.js', 'NestJS'],
      maxPriceExclusive: false,
      page: 1,
      limit: 2,
    });
  });
  it('does not inherit an old strict boundary when changing to a new inclusive budget', () => {
    expect(resolve({ action: 'refine', maxPrice: 300000 })).toMatchObject({
      maxPrice: 300000,
      maxPriceExclusive: false,
      keyword: 'backend',
    });
  });
  it('drops old technology alternatives when explicitly changing topic while retaining budget', () => {
    const filters = resolve({
      action: 'refine',
      keyword: 'React',
      relatedKeywords: [],
    });
    expect(filters).toMatchObject({
      keyword: 'React',
      maxPrice: 200000,
      isFree: false,
    });
    expect(filters).not.toHaveProperty('relatedKeywords');
  });
  it('resets every prior filter for a new independent topic', () => {
    expect(resolve({ action: 'new_search', keyword: 'Yoga' })).toEqual({
      keyword: 'Yoga',
      maxPriceExclusive: false,
      page: 1,
      limit: 5,
    });
  });
  it('increments page without changing any other criteria or mutating previous context', () => {
    expect(resolve({ action: 'next_page' })).toEqual({
      ...previous.filters,
      page: 4,
    });
    expect(previous.filters.page).toBe(3);
  });
  it('uses the cheapest actual last result for cheaper, never a model-guessed price', () => {
    expect(resolve({ action: 'cheaper' })).toEqual({
      ...previous.filters,
      maxPrice: 50000,
      maxPriceExclusive: true,
      page: 1,
    });
  });
  it.each(['refine', 'next_page', 'cheaper'])(
    'requires previous context for %s',
    (action) => {
      expect(() =>
        resolveSearchCoursesArguments(JSON.stringify({ action })),
      ).toThrow(ChatbotFollowUpError);
    },
  );
  it.each([
    [{ ...previous, hasMore: false }, 'next_page', 'no_more'],
    [{ ...previous, lowestPrice: null }, 'cheaper', 'no_price'],
    [{ ...previous, lowestPrice: 0 }, 'cheaper', 'already_free'],
  ] as const)(
    'does not invent more pages or a price reference',
    (context, action, reason) => {
      expect(() => resolve({ action }, context)).toThrowError(
        expect.objectContaining({ reason }),
      );
    },
  );
  it.each([
    { action: 'delete_course' },
    { action: 'next_page', maxPrice: 1 },
    { action: 'cheaper', keyword: 'React' },
    { action: 'refine', clearFilters: ['status'] },
    { action: 'refine', clearFilters: 'level' },
    { action: 'new_search', clearFilters: ['level'] },
    { action: 'refine', minPrice: 300000 },
    { action: 'refine', userId: 'someone-else' },
    { action: 'refine', level: null },
  ])('rejects invalid/contradictory operations (%j)', (args) => {
    expect(() => resolve(args)).toThrowError(
      expect.objectContaining({ code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' }),
    );
  });
  it('keeps pagination bounded to the existing maximum', () => {
    expect(() =>
      resolve(
        { action: 'next_page' },
        {
          ...previous,
          filters: { ...previous.filters, page: 1000 },
        },
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' }),
    );
  });
});
