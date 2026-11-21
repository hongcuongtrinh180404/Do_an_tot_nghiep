import Joi from 'joi';
import { CourseLevelEnum } from 'share-lib';
export const SEARCH_COURSES_NAME = 'search_courses';
export const SEARCH_COURSES_DEFAULT_LIMIT = 5;
export const SEARCH_COURSES_MAX_LIMIT = 10;
export const SEARCH_COURSES_MAX_PAGE = 1000;
export const SEARCH_COURSES_MAX_ARGUMENT_BYTES = 4096;
export const SEARCH_COURSES_MAX_RELATED_KEYWORDS = 8;
export class SearchCoursesError extends Error {
    code;
    constructor(code) {
        super(code === 'CHATBOT_TOOL_ARGUMENTS_INVALID'
            ? 'Course search arguments are invalid or contradictory.'
            : 'Course search is temporarily unavailable.');
        this.code = code;
        this.name = 'SearchCoursesError';
    }
}
export const SEARCH_COURSES_DEFINITION = {
    type: 'function',
    function: {
        name: SEARCH_COURSES_NAME,
        description: 'Search real published, non-deleted courses. Topic matches keyword OR relatedKeywords in title, public description, active category name or tags, ranked by relevance. All price/level/free filters are mandatory AND conditions. Expand only broad learning goals, never substitute an explicitly requested technology. Prices are current selling prices in integer VND.',
        parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
                action: {
                    type: 'string',
                    enum: ['new_search', 'refine', 'next_page', 'cheaper'],
                    description: 'new_search (default): independent question/new topic, reset old filters. refine: change only explicitly supplied filters, inherit the rest and reset page to 1. next_page: show more with identical filters. cheaper: price strictly below the cheapest last displayed course. next_page/cheaper must have no other arguments.',
                },
                clearFilters: {
                    type: 'array',
                    maxItems: 5,
                    items: {
                        type: 'string',
                        enum: ['keyword', 'minPrice', 'maxPrice', 'isFree', 'level'],
                    },
                    description: 'Only with refine: remove filters explicitly cancelled by the user. To remove a price range supply minPrice and maxPrice. Do not remove unchanged filters.',
                },
                keyword: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    description: 'Original topic or learning goal from the user, not a replacement category. Do not include price or level words.',
                },
                relatedKeywords: {
                    type: 'array',
                    maxItems: SEARCH_COURSES_MAX_RELATED_KEYWORDS,
                    items: { type: 'string', minLength: 1, maxLength: 100 },
                    description: 'Up to 8 directly relevant technologies or synonymous phrases for a broad goal, e.g. làm website -> HTML, CSS, JavaScript, React, Next.js, frontend, web development; backend -> Node.js, NestJS, Express, REST API. Omit for specific technologies such as React or Python, exact keyword requests, unknown topics and price-only questions. Do not add broad IT/CNTT categories or generic words like course, học, phát triển.',
                },
                minPrice: {
                    type: 'integer',
                    minimum: 0,
                    maximum: Number.MAX_SAFE_INTEGER,
                    description: 'Inclusive minimum current price in VND, e.g. 200k = 200000.',
                },
                maxPrice: {
                    type: 'integer',
                    minimum: 0,
                    maximum: Number.MAX_SAFE_INTEGER,
                    description: 'Inclusive maximum current price in VND by default. For "under/dưới", also set maxPriceExclusive=true.',
                },
                maxPriceExclusive: {
                    type: 'boolean',
                    description: 'true means price < maxPrice ("dưới"); false/default means price <= maxPrice ("tối đa", "đến"). Only set true with maxPrice.',
                },
                isFree: {
                    type: 'boolean',
                    description: 'true: price=0; false: paid courses only. Omit when the user did not specify.',
                },
                level: {
                    type: 'string',
                    enum: Object.values(CourseLevelEnum),
                    description: 'Exact course level. "người mới/cơ bản" = beginner; "trung cấp" = intermediate; "nâng cao" = advanced; "mọi trình độ" = all_levels. Omit if unspecified.',
                },
                page: {
                    type: 'integer',
                    minimum: 1,
                    maximum: SEARCH_COURSES_MAX_PAGE,
                    description: 'Default 1 for a new search/refinement. Use action=next_page, without filters, for show more.',
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
    relatedKeywords: Joi.array()
        .items(Joi.string().min(1).max(100))
        .max(SEARCH_COURSES_MAX_RELATED_KEYWORDS),
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
    'relatedKeywords',
    'minPrice',
    'maxPrice',
    'maxPriceExclusive',
    'isFree',
    'level',
    'page',
    'limit',
]);
export function parseSearchCoursesArguments(raw) {
    const invalid = () => new SearchCoursesError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    if (typeof raw !== 'string' ||
        Buffer.byteLength(raw, 'utf8') > SEARCH_COURSES_MAX_ARGUMENT_BYTES) {
        throw invalid();
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw invalid();
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw invalid();
    const input = parsed;
    if (Object.keys(input).some((key) => !ARGUMENT_KEYS.has(key)))
        throw invalid();
    const { value, error } = argumentsSchema.validate({
        ...input,
        ...(typeof input.keyword === 'string'
            ? { keyword: input.keyword.trim().normalize('NFC') }
            : {}),
        ...(Array.isArray(input.relatedKeywords)
            ? {
                relatedKeywords: input.relatedKeywords.map((term) => typeof term === 'string' ? term.trim().normalize('NFC') : term),
            }
            : {}),
    }, { convert: false, abortEarly: false });
    if (error)
        throw invalid();
    const filters = value;
    if (filters.relatedKeywords?.length && !filters.keyword)
        throw invalid();
    if (filters.maxPriceExclusive && filters.maxPrice === undefined)
        throw invalid();
    const lowerBound = Math.max(filters.minPrice ?? 0, filters.isFree === false ? 1 : 0);
    const requestedUpperBound = filters.maxPrice === undefined
        ? Number.MAX_SAFE_INTEGER
        : filters.maxPrice - (filters.maxPriceExclusive ? 1 : 0);
    const upperBound = filters.isFree === true
        ? Math.min(0, requestedUpperBound)
        : requestedUpperBound;
    if (lowerBound > upperBound)
        throw invalid();
    if (filters.relatedKeywords) {
        const seen = new Set([filters.keyword?.toLowerCase()]);
        const relatedKeywords = filters.relatedKeywords.filter((term) => {
            const key = term.toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        if (relatedKeywords.length) {
            filters.relatedKeywords = Object.freeze(relatedKeywords);
        }
        else {
            delete filters.relatedKeywords;
        }
    }
    return Object.freeze({ ...filters });
}
//# sourceMappingURL=search-courses.contract.js.map