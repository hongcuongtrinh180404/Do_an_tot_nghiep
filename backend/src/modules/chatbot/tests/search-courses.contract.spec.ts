import { describe, expect, it } from 'vitest';
import { CourseLevelEnum } from 'share-lib';
import {
  parseSearchCoursesArguments,
  SEARCH_COURSES_DEFINITION,
  SearchCoursesError,
} from '../tools/search-courses.contract.js';

describe('search_courses contract', () => {
  it('exposes only the read-only search arguments', () => {
    expect(SEARCH_COURSES_DEFINITION.function.name).toBe('search_courses');
    expect(SEARCH_COURSES_DEFINITION.function.parameters).toMatchObject({
      additionalProperties: false,
      properties: {
        level: { enum: Object.values(CourseLevelEnum) },
        limit: { maximum: 10 },
        relatedKeywords: { type: 'array', maxItems: 8 },
      },
    });
    expect(
      SEARCH_COURSES_DEFINITION.function.parameters?.properties,
    ).not.toHaveProperty('status');
  });

  it('normalizes, deduplicates and freezes related terms without changing hard filters', () => {
    const filters = parseSearchCoursesArguments(
      JSON.stringify({
        keyword: ' backend ',
        relatedKeywords: [' Backend ', ' NestJS ', 'nestjs', 'REST API'],
        maxPrice: 200000,
        maxPriceExclusive: true,
        level: 'beginner',
        isFree: false,
      }),
    );
    expect(filters).toEqual({
      keyword: 'backend',
      relatedKeywords: ['NestJS', 'REST API'],
      maxPrice: 200000,
      maxPriceExclusive: true,
      level: 'beginner',
      isFree: false,
      page: 1,
      limit: 5,
    });
    expect(Object.isFrozen(filters.relatedKeywords)).toBe(true);
  });

  it('omits an empty or entirely redundant expansion and normalizes Unicode', () => {
    expect(
      parseSearchCoursesArguments('{"keyword":"React","relatedKeywords":[]}'),
    ).not.toHaveProperty('relatedKeywords');
    expect(
      parseSearchCoursesArguments(
        '{"keyword":"React","relatedKeywords":["react"]}',
      ),
    ).not.toHaveProperty('relatedKeywords');
    expect(
      parseSearchCoursesArguments(
        JSON.stringify({
          keyword: 'lập trình'.normalize('NFD'),
          relatedKeywords: ['lập trình', 'Python'],
        }),
      ),
    ).toMatchObject({ keyword: 'lập trình', relatedKeywords: ['Python'] });
  });

  it('uses bounded defaults without adding a level/free/keyword filter', () => {
    const filters = parseSearchCoursesArguments('{}');
    expect(filters).toEqual({ page: 1, limit: 5, maxPriceExclusive: false });
    expect(Object.isFrozen(filters)).toBe(true);
  });

  it.each([
    [{ keyword: 'React' }, { keyword: 'React' }],
    [
      { maxPrice: 500000, maxPriceExclusive: true },
      { maxPrice: 500000, maxPriceExclusive: true },
    ],
    [
      { keyword: 'Python', level: 'beginner' },
      { keyword: 'Python', level: 'beginner' },
    ],
    [{ isFree: true }, { isFree: true }],
    [
      { keyword: 'thiết kế', minPrice: 200000, maxPrice: 500000 },
      { keyword: 'thiết kế', minPrice: 200000, maxPrice: 500000 },
    ],
    [{ keyword: ' React.js ' }, { keyword: 'React.js' }],
    [
      { minPrice: 0, maxPrice: 0, isFree: true },
      { minPrice: 0, maxPrice: 0, isFree: true },
    ],
    [
      { minPrice: 500000, maxPrice: 500000 },
      { minPrice: 500000, maxPrice: 500000 },
    ],
    [
      { isFree: false, maxPrice: 2, maxPriceExclusive: true },
      { isFree: false, maxPrice: 2, maxPriceExclusive: true },
    ],
    [
      { page: 1000, limit: 10 },
      { page: 1000, limit: 10 },
    ],
  ])('validates and normalizes %j', (input, expected) => {
    expect(parseSearchCoursesArguments(JSON.stringify(input))).toMatchObject(
      expected,
    );
  });

  it.each([
    '',
    '{"keyword":',
    'null',
    '[]',
    '"React"',
    '42',
    '{"status":"draft"}',
    '{"deletedAt":{"$ne":null}}',
    '{"userId":"someone-else"}',
    '{"keyword":{"$ne":null}}',
    '{"keyword":""}',
    '{"keyword":"  "}',
    '{"relatedKeywords":["React"]}',
    '{"keyword":"backend","relatedKeywords":"NestJS"}',
    '{"keyword":"backend","relatedKeywords":[{"$ne":null}]}',
    '{"keyword":"backend","relatedKeywords":[null]}',
    '{"keyword":"backend","relatedKeywords":[" "]}',
    JSON.stringify({ keyword: 'backend', relatedKeywords: ['x'.repeat(101)] }),
    JSON.stringify({
      keyword: 'backend',
      relatedKeywords: Array(9).fill('NestJS'),
    }),
    JSON.stringify({ keyword: 'a'.repeat(101) }),
    '{"level":"expert"}',
    '{"level":null}',
    '{"isFree":"true"}',
    '{"maxPrice":"500000"}',
    '{"minPrice":-1}',
    '{"maxPrice":-1}',
    '{"maxPrice":1.5}',
    '{"maxPrice":1e309}',
    '{"minPrice":500001,"maxPrice":500000}',
    '{"minPrice":500000,"maxPrice":500000,"maxPriceExclusive":true}',
    '{"maxPriceExclusive":true}',
    '{"isFree":true,"minPrice":1}',
    '{"isFree":true,"maxPrice":0,"maxPriceExclusive":true}',
    '{"isFree":false,"maxPrice":0}',
    '{"isFree":false,"maxPrice":1,"maxPriceExclusive":true}',
    '{"limit":0}',
    '{"limit":11}',
    '{"page":0}',
    '{"page":1001}',
    '{"page":1.5}',
    '{"limit":"5"}',
    JSON.stringify({ keyword: 'é'.repeat(2500) }),
    '{"__proto__":{"polluted":true}}',
  ])('rejects malformed, unknown or conflicting arguments (%s)', (raw) => {
    expect(() => parseSearchCoursesArguments(raw)).toThrowError(
      expect.objectContaining({ code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' }),
    );
  });

  it('does not retain arguments, JSON errors or validation details', () => {
    const secret = 'private-argument-sentinel';
    let caught: unknown;
    try {
      parseSearchCoursesArguments(JSON.stringify({ maxPrice: secret }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SearchCoursesError);
    expect(String(caught) + JSON.stringify(caught)).not.toContain(secret);
    expect(caught).not.toHaveProperty('cause');
  });
});
