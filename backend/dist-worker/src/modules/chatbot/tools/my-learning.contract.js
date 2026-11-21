import Joi from 'joi';
import { LearningStatusEnum } from 'share-lib';
import { ChatbotLearningError, LearningFollowUpError, } from './my-learning.types.js';
export const GET_MY_COURSES_NAME = 'get_my_courses';
export const GET_MY_LEARNING_PROGRESS_NAME = 'get_my_learning_progress';
export const learningTextSchema = Joi.string().min(1).max(100);
export const objectIdSchema = Joi.string().pattern(/^[a-f\d]{24}$/i);
export const myCoursesFiltersSchema = Joi.object({
    keyword: learningTextSchema,
    learningStatus: Joi.string().valid(...Object.values(LearningStatusEnum)),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(10).default(5),
}).unknown(false);
function parse(raw, allowed) {
    const invalid = () => new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 4096)
        throw invalid();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        throw invalid();
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw invalid();
    if (Object.keys(value).some((key) => !allowed.includes(key)))
        throw invalid();
    return Object.fromEntries(Object.entries(value).map(([key, field]) => [
        key, typeof field === 'string' ? field.trim().normalize('NFC') : field,
    ]));
}
export function validateLearning(schema, value) {
    const result = schema.validate(value, { convert: false, abortEarly: false });
    if (result.error)
        throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    return result.value;
}
export function resolveMyCoursesArguments(raw, context) {
    const input = parse(raw, ['action', 'clearFilters', 'keyword', 'learningStatus', 'page', 'limit']);
    const { action = 'new_list', clearFilters = [], ...fields } = input;
    validateLearning(Joi.object({
        action: Joi.string().valid('new_list', 'refine', 'next_page').required(),
        clearFilters: Joi.array().items(Joi.string().valid('keyword', 'learningStatus')).unique().max(2).required(),
    }), { action, clearFilters });
    if (action === 'new_list') {
        if (clearFilters.length)
            throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
        return validateLearning(myCoursesFiltersSchema, fields);
    }
    const list = context?.list;
    if (list?.kind !== 'my_courses')
        throw new LearningFollowUpError('missing_list');
    if (action === 'next_page') {
        if (Object.keys(fields).length || clearFilters.length) {
            throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
        }
        if (!list.hasMore)
            throw new LearningFollowUpError('no_more');
        return validateLearning(myCoursesFiltersSchema, { ...list.filters, page: list.filters.page + 1 });
    }
    const patch = validateLearning(myCoursesFiltersSchema, fields);
    const merged = { ...list.filters, page: 1 };
    for (const key of clearFilters)
        delete merged[key];
    for (const key of Object.keys(fields)) {
        Object.assign(merged, { [key]: patch[key] });
    }
    merged.page = 1;
    return validateLearning(myCoursesFiltersSchema, merged);
}
export function parseLearningProgressArguments(raw) {
    const fields = parse(raw, ['scope', 'courseId', 'courseName', 'position', 'current', 'page', 'limit']);
    const parsed = validateLearning(Joi.object({
        scope: Joi.string().valid('overview', 'course', 'next_page').required(),
        courseId: objectIdSchema,
        courseName: learningTextSchema,
        position: Joi.number().integer().min(1).max(10),
        current: Joi.boolean().valid(true),
        page: Joi.number().integer().min(1).max(1000).default(1),
        limit: Joi.number().integer().min(1).max(10).default(5),
    }).unknown(false), fields);
    const selectors = ['courseId', 'courseName', 'position', 'current'].filter((key) => key in fields);
    if ((parsed.scope === 'course' && selectors.length !== 1)
        || (parsed.scope !== 'course' && Object.keys(fields).length !== 1)
        || (!parsed.courseName && ('page' in fields || 'limit' in fields))) {
        throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    }
    if (parsed.courseId)
        parsed.courseId = parsed.courseId.toLowerCase();
    return parsed;
}
const pagingProperties = {
    page: { type: 'integer', minimum: 1, maximum: 1000 },
    limit: { type: 'integer', minimum: 1, maximum: 10, description: 'Default 5, maximum 10.' },
};
export const GET_MY_COURSES_DEFINITION = {
    type: 'function',
    function: {
        name: GET_MY_COURSES_NAME,
        description: 'Read courses owned by the authenticated account (active enrollments, including free registrations), with current learning progress. Never use catalog prices as purchase history. No userId argument.',
        parameters: {
            type: 'object', additionalProperties: false,
            properties: {
                action: { type: 'string', enum: ['new_list', 'refine', 'next_page'],
                    description: 'new_list resets filters; refine changes only supplied filters and resets page; next_page has no other fields and preserves the last personal list.' },
                keyword: { type: 'string', minLength: 1, maxLength: 100, description: 'Literal course title query. Do not expand into related technologies.' },
                learningStatus: { type: 'string', enum: Object.values(LearningStatusEnum) },
                clearFilters: { type: 'array', maxItems: 2, items: { type: 'string', enum: ['keyword', 'learningStatus'] } },
                ...pagingProperties,
            },
        },
    },
};
export const GET_MY_LEARNING_PROGRESS_DEFINITION = {
    type: 'function',
    function: {
        name: GET_MY_LEARNING_PROGRESS_NAME,
        description: 'Read the authenticated learner’s overview, or progress/resume point of one owned course. Resolve ambiguous names by asking the learner to choose. No writes, no other account.',
        parameters: {
            type: 'object', additionalProperties: false, required: ['scope'],
            properties: {
                scope: { type: 'string', enum: ['overview', 'course', 'next_page'],
                    description: 'overview has no other fields. course requires exactly one selector. next_page has no other fields, only when selecting among ambiguous course names.' },
                courseName: { type: 'string', minLength: 1, maxLength: 100, description: 'Course name explicitly supplied by the user.' },
                courseId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$', description: 'Only an ID explicitly supplied in the current message/link, never guess.' },
                position: { type: 'integer', minimum: 1, maximum: 10, description: 'Position on the MOST RECENT displayed list, numbered from 1 on each page. Backend resolves its ID.' },
                current: { type: 'boolean', enum: [true], description: 'The previously selected course, e.g. khóa đó, còn bao nhiêu bài.' },
                ...pagingProperties,
            },
        },
    },
};
//# sourceMappingURL=my-learning.contract.js.map