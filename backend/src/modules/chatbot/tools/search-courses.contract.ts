import Joi from 'joi';
import { CourseLevelEnum } from 'share-lib';
import type { PublicCourseSearchFilters } from '../../course/interfaces/public-course-search.interface.js';
import type { ChatbotToolDefinition } from '../chatbot.types.js';

export const SEARCH_COURSES_NAME = 'search_courses';
export const SEARCH_COURSES_DEFAULT_LIMIT = 5;
export const SEARCH_COURSES_MAX_LIMIT = 10;
export const SEARCH_COURSES_MAX_PAGE = 1000;
export const SEARCH_COURSES_MAX_ARGUMENT_BYTES = 4096;

export class SearchCoursesError extends Error {
  constructor(
    readonly code:
      'CHATBOT_TOOL_ARGUMENTS_INVALID' | 'CHATBOT_SEARCH_UNAVAILABLE',
  ) {
    super(
      code === 'CHATBOT_TOOL_ARGUMENTS_INVALID'
        ? 'Course search arguments are invalid or contradictory.'
        : 'Course search is temporarily unavailable.',
    );
    this.name = 'SearchCoursesError';
    // Do not retain untrusted arguments, database errors or their causes.
  }
}

export const SEARCH_COURSES_DEFINITION: ChatbotToolDefinition = {
  type: 'function',
  function: {
    name: SEARCH_COURSES_NAME,
    description:
      'Search real published, non-deleted courses in the Mindly catalog. Combine all specified filters with AND. Only supply criteria the user requested. Prices are current selling prices in integer VND.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        keyword: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description:
            'Topic to match literally in the course title OR active category name. Do not include price or level words.',
        },
        minPrice: {
          type: 'integer',
          minimum: 0,
          maximum: Number.MAX_SAFE_INTEGER,
          description:
            'Inclusive minimum current price in VND, e.g. 200k = 200000.',
        },
        maxPrice: {
          type: 'integer',
          minimum: 0,
          maximum: Number.MAX_SAFE_INTEGER,
          description:
            'Inclusive maximum current price in VND by default. For "under/dưới", also set maxPriceExclusive=true.',
        },
        maxPriceExclusive: {
          type: 'boolean',
          description:
            'true means price < maxPrice ("dưới"); false/default means price <= maxPrice ("tối đa", "đến"). Only set true with maxPrice.',
        },
        isFree: {
          type: 'boolean',
          description:
            'true: price=0; false: paid courses only. Omit when the user did not specify.',
        },
        level: {
          type: 'string',
          enum: Object.values(CourseLevelEnum),
          description:
            'Exact course level. "người mới/cơ bản" = beginner; "trung cấp" = intermediate; "nâng cao" = advanced; "mọi trình độ" = all_levels. Omit if unspecified.',
        },
        page: {
          type: 'integer',
          minimum: 1,
          maximum: SEARCH_COURSES_MAX_PAGE,
          description:
            'Default 1. Requires the full search criteria on each request.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: SEARCH_COURSES_MAX_LIMIT,
          description: 'Default 5, maximum 10 courses per page.',
        },
      },
    },
  },
};

const argumentsSchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  minPrice: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
  maxPrice: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
  maxPriceExclusive: Joi.boolean().default(false),
  isFree: Joi.boolean(),
  level: Joi.string().valid(...Object.values(CourseLevelEnum)),
  page: Joi.number().integer().min(1).max(SEARCH_COURSES_MAX_PAGE).default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(SEARCH_COURSES_MAX_LIMIT)
    .default(SEARCH_COURSES_DEFAULT_LIMIT),
}).unknown(false);

const ARGUMENT_KEYS = new Set([
  'keyword',
  'minPrice',
  'maxPrice',
  'maxPriceExclusive',
  'isFree',
  'level',
  'page',
  'limit',
]);

export function parseSearchCoursesArguments(
  raw: string,
): PublicCourseSearchFilters {
  const invalid = () =>
    new SearchCoursesError('CHATBOT_TOOL_ARGUMENTS_INVALID');
  if (
    typeof raw !== 'string' ||
    Buffer.byteLength(raw, 'utf8') > SEARCH_COURSES_MAX_ARGUMENT_BYTES
  ) {
    throw invalid();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalid();
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw invalid();
  const input = parsed as Record<string, unknown>;
  // Joi intentionally ignores __proto__; reject every non-allowlisted key before validation.
  if (Object.keys(input).some((key) => !ARGUMENT_KEYS.has(key)))
    throw invalid();
  const { value, error } = argumentsSchema.validate(
    {
      ...input,
      ...(typeof input.keyword === 'string'
        ? { keyword: input.keyword.trim() }
        : {}),
    },
    { convert: false, abortEarly: false },
  );
  if (error) throw invalid();
  const filters = value as PublicCourseSearchFilters;
  if (filters.maxPriceExclusive && filters.maxPrice === undefined)
    throw invalid();

  // All price predicates must have a nonempty intersection; do not silently drop a filter.
  const lowerBound = Math.max(
    filters.minPrice ?? 0,
    filters.isFree === false ? 1 : 0,
  );
  const requestedUpperBound =
    filters.maxPrice === undefined
      ? Number.MAX_SAFE_INTEGER
      : filters.maxPrice - (filters.maxPriceExclusive ? 1 : 0);
  const upperBound =
    filters.isFree === true
      ? Math.min(0, requestedUpperBound)
      : requestedUpperBound;
  if (lowerBound > upperBound) throw invalid();
  return Object.freeze({ ...filters });
}
