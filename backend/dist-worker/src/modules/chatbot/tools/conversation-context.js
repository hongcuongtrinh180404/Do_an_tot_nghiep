import Joi from 'joi';
import { parseSearchCoursesArguments } from './search-courses.contract.js';
import { learningTextSchema, myCoursesFiltersSchema, objectIdSchema, validateLearning } from './my-learning.contract.js';
import { businessQuerySchema } from './instructor-business.contract.js';
const ids = Joi.array().items(objectIdSchema).unique().max(10).required();
const page = Joi.number().integer().min(1).max(1000).required();
const limit = Joi.number().integer().min(1).max(10).required();
const schema = Joi.object({
    mode: Joi.string().valid('catalog', 'my_courses', 'learning_progress', 'instructor_revenue', 'instructor_sales_stats').required(),
    selectedCourseId: objectIdSchema,
    business: Joi.object({ query: businessQuerySchema.required(), selectedCourseId: objectIdSchema }).unknown(false),
    list: Joi.alternatives().try(Joi.object({
        kind: Joi.valid('catalog').required(), ids,
        filters: Joi.object().unknown(true).required(),
        lowestPrice: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).allow(null).required(),
        hasMore: Joi.boolean().required(),
    }).unknown(false), Joi.object({
        kind: Joi.valid('my_courses').required(), ids,
        filters: myCoursesFiltersSchema.required(), hasMore: Joi.boolean().required(),
    }).unknown(false), Joi.object({
        kind: Joi.valid('selection').required(), ids,
        keyword: learningTextSchema.required(), page, limit, hasMore: Joi.boolean().required(),
    }).unknown(false), Joi.object({
        kind: Joi.valid('business_selection').required(), ids,
        query: businessQuerySchema.required(), keyword: learningTextSchema.required(), page, limit, hasMore: Joi.boolean().required(),
    }).unknown(false), Joi.object({
        kind: Joi.valid('business_top').required(), query: businessQuerySchema.required(), ids, page, limit, hasMore: Joi.boolean().required(),
    }).unknown(false)),
}).unknown(false);
export function validateConversationContext(input) {
    const state = validateLearning(schema, input);
    const businessMode = state.mode === 'instructor_revenue' || state.mode === 'instructor_sales_stats';
    if (state.list?.kind === 'catalog') {
        state.list.filters = parseSearchCoursesArguments(JSON.stringify(state.list.filters));
    }
    if ((state.mode === 'catalog' && state.list?.kind !== 'catalog')
        || (state.mode === 'my_courses' && state.list?.kind !== 'my_courses')
        || (state.selectedCourseId && state.mode !== 'learning_progress')
        || businessMode !== Boolean(state.business)
        || (businessMode && ((state.mode === 'instructor_revenue') !== (state.business?.query.mode === 'revenue')))
        || (state.business?.selectedCourseId && state.business.selectedCourseId !== state.business.query.courseId)
        || (state.list && ['business_selection', 'business_top'].includes(state.list.kind) && !businessMode)
        || (businessMode && state.list && !['business_selection', 'business_top'].includes(state.list.kind))
        || (state.list && 'query' in state.list && (state.list.query.page !== state.list.page
            || state.list.query.limit !== state.list.limit
            || (state.list.kind === 'business_top' && state.list.query.mode !== 'top_courses')
            || (state.list.kind === 'business_selection' && (!state.list.query.courseName
                || state.list.query.courseName !== state.list.keyword || state.list.query.courseId))))
        || (state.list && state.list.ids.length > ('filters' in state.list ? state.list.filters.limit : state.list.limit))) {
        throw new Error('Invalid conversation navigation state');
    }
    return state;
}
//# sourceMappingURL=conversation-context.js.map