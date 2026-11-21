import Joi from 'joi';
import { parseSearchCoursesArguments } from './search-courses.contract.js';
import { learningTextSchema, myCoursesFiltersSchema, objectIdSchema, validateLearning } from './my-learning.contract.js';
import type { ChatbotConversationContext } from './my-learning.types.js';

const ids = Joi.array().items(objectIdSchema).unique().max(10).required();
const page = Joi.number().integer().min(1).max(1000).required();
const limit = Joi.number().integer().min(1).max(10).required();
const schema = Joi.object({
  mode: Joi.string().valid('catalog', 'my_courses', 'learning_progress').required(),
  selectedCourseId: objectIdSchema,
  list: Joi.alternatives().try(
    Joi.object({
      kind: Joi.valid('catalog').required(), ids,
      filters: Joi.object().unknown(true).required(),
      lowestPrice: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).allow(null).required(),
      hasMore: Joi.boolean().required(),
    }).unknown(false),
    Joi.object({
      kind: Joi.valid('my_courses').required(), ids,
      filters: myCoursesFiltersSchema.required(), hasMore: Joi.boolean().required(),
    }).unknown(false),
    Joi.object({
      kind: Joi.valid('selection').required(), ids,
      keyword: learningTextSchema.required(), page, limit, hasMore: Joi.boolean().required(),
    }).unknown(false),
  ),
}).unknown(false);

export function validateConversationContext(input: unknown): ChatbotConversationContext {
  const state = validateLearning<ChatbotConversationContext>(schema, input);
  if (state.list?.kind === 'catalog') {
    state.list.filters = parseSearchCoursesArguments(JSON.stringify(state.list.filters));
  }
  if ((state.mode === 'catalog' && state.list?.kind !== 'catalog')
    || (state.mode === 'my_courses' && state.list?.kind !== 'my_courses')
    || (state.selectedCourseId && state.mode !== 'learning_progress')
    || (state.list && state.list.ids.length > (state.list.kind === 'selection' ? state.list.limit : state.list.filters.limit))) {
    throw new Error('Invalid conversation navigation state');
  }
  return state;
}
