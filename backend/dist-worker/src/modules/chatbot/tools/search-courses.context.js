import { parseSearchCoursesArguments, SEARCH_COURSES_MAX_ARGUMENT_BYTES, SearchCoursesError, } from './search-courses.contract.js';
export class ChatbotFollowUpError extends Error {
    reason;
    constructor(reason) {
        super('The course search follow-up needs clarification.');
        this.reason = reason;
    }
}
const clearable = new Set([
    'keyword',
    'minPrice',
    'maxPrice',
    'isFree',
    'level',
]);
const actions = new Set(['new_search', 'refine', 'next_page', 'cheaper']);
export function resolveSearchCoursesArguments(raw, previous) {
    const invalid = () => new SearchCoursesError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    if (typeof raw !== 'string' ||
        Buffer.byteLength(raw, 'utf8') > SEARCH_COURSES_MAX_ARGUMENT_BYTES)
        throw invalid();
    let input;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            throw invalid();
        input = parsed;
    }
    catch {
        throw invalid();
    }
    const { action = 'new_search', clearFilters = [], ...fields } = input;
    if (typeof action !== 'string' ||
        !actions.has(action) ||
        !Array.isArray(clearFilters) ||
        clearFilters.length > clearable.size ||
        clearFilters.some((field) => typeof field !== 'string' || !clearable.has(field)))
        throw invalid();
    if (action === 'new_search') {
        if (clearFilters.length)
            throw invalid();
        return parseSearchCoursesArguments(JSON.stringify(fields));
    }
    if (!previous)
        throw new ChatbotFollowUpError('missing_context');
    if (action === 'next_page' || action === 'cheaper') {
        if (Object.keys(fields).length || clearFilters.length)
            throw invalid();
        if (action === 'next_page') {
            if (!previous.hasMore)
                throw new ChatbotFollowUpError('no_more');
            return parseSearchCoursesArguments(JSON.stringify({
                ...previous.filters,
                page: previous.filters.page + 1,
            }));
        }
        if (previous.lowestPrice === null)
            throw new ChatbotFollowUpError('no_price');
        if (previous.lowestPrice === 0)
            throw new ChatbotFollowUpError('already_free');
        return parseSearchCoursesArguments(JSON.stringify({
            ...previous.filters,
            page: 1,
            maxPrice: Math.min(previous.filters.maxPrice ?? Number.MAX_SAFE_INTEGER, previous.lowestPrice),
            maxPriceExclusive: true,
        }));
    }
    const validated = parseSearchCoursesArguments(JSON.stringify(fields));
    const patch = Object.fromEntries(Object.keys(fields).map((key) => [
        key,
        validated[key],
    ]));
    const merged = {
        ...previous.filters,
        page: 1,
    };
    for (const key of clearFilters) {
        delete merged[key];
        if (key === 'keyword')
            delete merged.relatedKeywords;
        if (key === 'maxPrice')
            merged.maxPriceExclusive = false;
    }
    if (patch.keyword !== undefined &&
        patch.keyword.toLowerCase() !== previous.filters.keyword?.toLowerCase()) {
        delete merged.relatedKeywords;
    }
    if (patch.maxPrice !== undefined)
        merged.maxPriceExclusive = patch.maxPriceExclusive ?? false;
    if (patch.isFree === true && patch.minPrice === undefined)
        delete merged.minPrice;
    return parseSearchCoursesArguments(JSON.stringify({ ...merged, ...patch }));
}
//# sourceMappingURL=search-courses.context.js.map