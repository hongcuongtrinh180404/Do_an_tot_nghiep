import Joi from 'joi';
import { BusinessFollowUpError, ChatbotBusinessError, } from './instructor-business.types.js';
export const GET_INSTRUCTOR_REVENUE_NAME = 'get_instructor_revenue';
export const GET_INSTRUCTOR_SALES_STATS_NAME = 'get_instructor_sales_stats';
export const BUSINESS_TIME_RANGES = [
    'today', 'yesterday', 'this_week', 'last_week', '7days', '30days', 'this_month', 'last_month', 'this_year', 'custom',
];
const date = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const id = Joi.string().pattern(/^[a-f\d]{24}$/i);
export const businessPeriodSchema = Joi.object({
    timeRange: Joi.string().valid(...BUSINESS_TIME_RANGES).required(),
    startDate: date, endDate: date,
}).unknown(false).custom((value, helpers) => {
    if (value.timeRange === 'custom' ? !value.startDate || !value.endDate : value.startDate || value.endDate) {
        return helpers.error('any.invalid');
    }
    return value;
});
export const businessQuerySchema = Joi.object({
    period: businessPeriodSchema.required(), comparePeriod: businessPeriodSchema,
    courseId: id, courseName: Joi.string().min(1).max(100),
    mode: Joi.string().valid('revenue', 'sales_count', 'top_courses', 'compare').required(),
    metric: Joi.string().valid('instructor_earnings', 'successful_sales').required(),
    page: Joi.number().integer().min(1).max(1000).required(),
    limit: Joi.number().integer().min(1).max(10).required(),
}).unknown(false).custom((value, helpers) => {
    if ((value.courseId && value.courseName)
        || (value.mode === 'top_courses' && (value.courseId || value.courseName))
        || (value.mode !== 'compare' && value.comparePeriod))
        return helpers.error('any.invalid');
    return value;
});
export function validateBusiness(schema, value) {
    const result = schema.validate(value, { convert: false, abortEarly: false });
    if (result.error)
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    return result.value;
}
const properties = {
    action: Joi.string().valid('new_query', 'refine', 'next_page'),
    timeRange: Joi.string().valid(...BUSINESS_TIME_RANGES), startDate: date, endDate: date,
    courseId: id, courseName: Joi.string().min(1).max(100),
    position: Joi.number().integer().min(1).max(10), current: Joi.boolean().valid(true),
    allCourses: Joi.boolean().valid(true),
    page: Joi.number().integer().min(1).max(1000), limit: Joi.number().integer().min(1).max(10),
};
export function resolveBusinessArguments(raw, tool, context) {
    if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 4096)
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    let input;
    try {
        input = JSON.parse(raw);
    }
    catch {
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    input = Object.fromEntries(Object.entries(input).map(([key, value]) => [
        key, typeof value === 'string' ? value.trim().normalize('NFC') : value,
    ]));
    validateBusiness(Joi.object({
        ...properties,
        ...(tool === 'stats' ? {
            mode: Joi.string().valid('sales_count', 'top_courses', 'compare'),
            metric: Joi.string().valid('instructor_earnings', 'successful_sales'),
            compareTimeRange: Joi.string().valid(...BUSINESS_TIME_RANGES), compareStartDate: date, compareEndDate: date,
        } : {}),
    }).unknown(false), input);
    const selectors = ['courseId', 'courseName', 'position', 'current', 'allCourses'].filter((key) => key in input);
    if (selectors.length > 1)
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    const action = (input.action ?? (input.position !== undefined || input.current || input.allCourses
        ? 'refine' : 'new_query'));
    const previous = context?.business?.query;
    if (action !== 'new_query' && !previous)
        throw new BusinessFollowUpError('missing_business_context');
    if (action === 'next_page') {
        const list = context?.list;
        if (Object.keys(input).length !== 1 || (list?.kind !== 'business_selection' && list?.kind !== 'business_top')) {
            throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
        }
        if (!list.hasMore)
            throw new BusinessFollowUpError('no_more_business');
        if ((tool === 'revenue') !== (list.query.mode === 'revenue'))
            throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
        const query = validateBusiness(businessQuerySchema, { ...list.query, page: list.page + 1 });
        return { action, query, preservesList: false };
    }
    const query = action === 'refine' && previous
        ? structuredClone(previous)
        : { period: { timeRange: 'this_month' }, mode: tool === 'revenue' ? 'revenue' : 'sales_count',
            metric: 'instructor_earnings', page: 1, limit: 5 };
    query.mode = tool === 'revenue' ? 'revenue' : input.mode
        ?? (query.mode === 'revenue' ? 'sales_count' : query.mode);
    if (tool === 'revenue')
        query.metric = 'instructor_earnings';
    if ('timeRange' in input || 'startDate' in input || 'endDate' in input) {
        query.period = validateBusiness(businessPeriodSchema, {
            timeRange: input.timeRange ?? 'custom',
            ...(input.startDate ? { startDate: input.startDate } : {}), ...(input.endDate ? { endDate: input.endDate } : {}),
        });
    }
    if ('compareTimeRange' in input || 'compareStartDate' in input || 'compareEndDate' in input) {
        query.comparePeriod = validateBusiness(businessPeriodSchema, {
            timeRange: input.compareTimeRange ?? 'custom',
            ...(input.compareStartDate ? { startDate: input.compareStartDate } : {}),
            ...(input.compareEndDate ? { endDate: input.compareEndDate } : {}),
        });
    }
    else if ('timeRange' in input || query.mode !== 'compare')
        delete query.comparePeriod;
    if (input.metric)
        query.metric = input.metric;
    if (input.metric && query.mode !== 'compare')
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    if (selectors.length || query.mode === 'top_courses') {
        delete query.courseId;
        delete query.courseName;
    }
    if (typeof input.courseId === 'string')
        query.courseId = input.courseId.toLowerCase();
    if (typeof input.courseName === 'string')
        query.courseName = input.courseName;
    if (query.mode === 'top_courses' && selectors.length)
        throw new ChatbotBusinessError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    query.page = action === 'refine' ? 1 : input.page ?? 1;
    if (input.limit !== undefined)
        query.limit = input.limit;
    validateBusiness(businessQuerySchema, query);
    return {
        action, query, ...(input.courseId ? { courseId: query.courseId } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.current ? { current: true } : {}),
        preservesList: !('timeRange' in input || 'startDate' in input || 'endDate' in input || input.allCourses),
    };
}
const definitionProperties = {
    action: { type: 'string', enum: ['new_query', 'refine', 'next_page'],
        description: 'new_query resets filters (default this_month, all courses). refine inherits the last business query and resets page. next_page has no other fields.' },
    timeRange: { type: 'string', enum: [...BUSINESS_TIME_RANGES], description: 'Relative dates are resolved by the backend in Vietnam time. 7days includes today and 6 preceding calendar days.' },
    startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Inclusive YYYY-MM-DD; required with endDate for custom.' },
    endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Inclusive YYYY-MM-DD, not a timestamp. Missing year uses server-provided current year.' },
    courseId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$', description: 'Only an ID explicitly written in the current user message. No instructorId or userId.' },
    courseName: { type: 'string', minLength: 1, maxLength: 100, description: 'Literal title supplied by the user. Ambiguous titles require selection.' },
    position: { type: 'integer', minimum: 1, maximum: 10, description: 'Position on the latest business selection or sales ranking, numbered from 1 on each page.' },
    current: { type: 'boolean', enum: [true], description: 'Previously selected instructor business course, not an enrolled learner course.' },
    allCourses: { type: 'boolean', enum: [true], description: 'Remove the course filter, e.g. tất cả khóa thì sao.' },
    page: { type: 'integer', minimum: 1, maximum: 1000 },
    limit: { type: 'integer', minimum: 1, maximum: 10, description: 'Default 5. Use 1 for a single best-selling course; ranks expose ties.' },
};
export const GET_INSTRUCTOR_REVENUE_DEFINITION = {
    type: 'function', function: {
        name: GET_INSTRUCTOR_REVENUE_NAME,
        description: 'Read the authenticated instructor’s earnings AFTER commission from PAID orders, optionally for one taught course. Backend calculates all amounts. Not bank payouts. Read-only.',
        parameters: { type: 'object', additionalProperties: false, properties: definitionProperties },
    },
};
export const GET_INSTRUCTOR_SALES_STATS_DEFINITION = {
    type: 'function', function: {
        name: GET_INSTRUCTOR_SALES_STATS_NAME,
        description: 'Read successful purchase counts, best-selling taught courses by purchase count, or compare periods for the authenticated instructor. Current month is compared with the ENTIRE previous month by default. Backend computes all deltas.',
        parameters: { type: 'object', additionalProperties: false, properties: {
                ...definitionProperties,
                mode: { type: 'string', enum: ['sales_count', 'top_courses', 'compare'] },
                metric: { type: 'string', enum: ['instructor_earnings', 'successful_sales'], description: 'Only for compare. Default instructor_earnings (net after commission).' },
                compareTimeRange: { type: 'string', enum: [...BUSINESS_TIME_RANGES] },
                compareStartDate: definitionProperties.startDate, compareEndDate: definitionProperties.endDate,
            } },
    },
};
//# sourceMappingURL=instructor-business.contract.js.map