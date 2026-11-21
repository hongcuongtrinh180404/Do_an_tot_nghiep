import { z } from 'zod';
import { CourseLevelEnum, LearningStatusEnum } from 'share-lib';

export const CHATBOT_MESSAGE_LIMIT = 2000;
export const CHATBOT_REQUEST_TIMEOUT_MS = 45000;
export const CHATBOT_CONTEXT_LIMIT = 8192;

const filtersSchema = z.object({
  keyword: z.string().optional(),
  relatedKeywords: z.array(z.string().min(1).max(100)).max(8).optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  maxPriceExclusive: z.boolean(),
  isFree: z.boolean().optional(),
  level: z.enum(CourseLevelEnum).optional(),
  page: z.number().int().positive(),
  limit: z.number().int().min(1).max(10),
});

const courseSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().min(1),
  price: z.number().int().nonnegative(),
  level: z.enum(CourseLevelEnum),
  categoryName: z.string().nullable(),
  url: z.string(),
}).refine((course) => course.url === `/courses/${course.id}`, {
  message: 'Invalid public course URL',
});

const base = {
  requestId: z.string().uuid(),
  answer: z.string().min(1),
  context: z.string().min(1).max(CHATBOT_CONTEXT_LIMIT).optional(),
};
const page = z.number().int().min(1).max(1000);
const limit = z.number().int().min(1).max(10);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id = z.string().regex(/^[a-f\d]{24}$/i);

export const chatbotSearchReplySchema = z.object({
  ...base,
  // Missing kind is accepted only for the original catalog API.
  kind: z.literal('course_search').optional(),
  status: z.enum(['found', 'empty', 'page_empty', 'needs_clarification']),
  result: z.object({
    filtersApplied: filtersSchema,
    items: z.array(courseSchema).max(10),
    currency: z.literal('VND'),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().min(1).max(10),
    hasMore: z.boolean(),
  }).optional(),
}).superRefine((reply, context) => {
  const result = reply.result;
  if (
    (reply.status !== 'needs_clarification' && !result)
    || (reply.status === 'found' && (!result?.items.length || result.total < result.items.length))
    || (reply.status === 'empty' && (result?.total !== 0 || result.items.length !== 0))
    || (reply.status === 'page_empty' && (!result?.total || result.items.length !== 0))
  ) {
    context.addIssue({ code: 'custom', message: 'Inconsistent course search result' });
  }
});

const progressSchema = z.object({
  status: z.enum(LearningStatusEnum),
  progressPercent: z.number().min(0).max(100).nullable(),
  completedLessons: count,
  totalLessons: count,
  watchedMs: count,
  lastLessonId: id.nullable(),
  lastPositionSeconds: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).refine((p) => {
  const percent = p.totalLessons ? Math.floor(p.completedLessons * 10000 / p.totalLessons) / 100 : null;
  return p.completedLessons <= p.totalLessons && p.progressPercent === percent
    && (p.status === LearningStatusEnum.COMPLETED) === (p.totalLessons > 0 && p.completedLessons === p.totalLessons)
    && (p.lastLessonId !== null || p.lastPositionSeconds === 0);
}, { message: 'Inconsistent learning progress' });

export const chatbotOwnedCourseSchema = z.object({
  id, title: z.string().min(1), enrolledAt: z.iso.datetime(),
  url: z.string(), resumeUrl: z.string().nullable(), progress: progressSchema,
}).refine((c) => (c.url === `/courses/${c.id}` || c.url === '/my-courses')
  && (c.resumeUrl === null || (c.progress.lastLessonId !== null
    && c.resumeUrl === `/courses/${c.id}/lessons/${c.progress.lastLessonId}`)), {
  message: 'Invalid owned course or resume URL',
});

const myCoursesReplySchema = z.object({
  ...base, kind: z.literal('my_courses'),
  status: z.enum(['found', 'empty', 'page_empty']),
  result: z.object({
    filtersApplied: z.object({
      keyword: z.string().min(1).max(100).optional(), learningStatus: z.enum(LearningStatusEnum).optional(), page, limit,
    }),
    items: z.array(chatbotOwnedCourseSchema).max(10), total: count, page, limit, hasMore: z.boolean(),
  }),
}).refine(({ status, result: r }) => r.items.length <= r.limit
  && r.page === r.filtersApplied.page && r.limit === r.filtersApplied.limit
  && r.hasMore === (r.total > r.page * r.limit)
  && (status === 'found' ? r.items.length > 0 && r.total >= r.items.length
    : status === 'empty' ? r.total === 0 && r.items.length === 0 : r.total > 0 && r.items.length === 0),
{ message: 'Inconsistent personal course list' });

const overviewSchema = z.object({
  scope: z.literal('overview'), totalCourses: count, notStarted: count, inProgress: count, completed: count,
}).refine((r) => r.totalCourses === r.notStarted + r.inProgress + r.completed);
const detailSchema = z.object({
  scope: z.literal('course'), course: chatbotOwnedCourseSchema, remainingLessons: count, lastLessonTitle: z.string().nullable(),
}).refine((r) => r.remainingLessons === r.course.progress.totalLessons - r.course.progress.completedLessons);
const selectionSchema = z.object({
  scope: z.literal('selection'), keyword: z.string().min(1).max(100),
  items: z.array(z.object({ id, title: z.string().min(1) })).max(10),
  total: count, page, limit, hasMore: z.boolean(),
}).refine((r) => r.items.length <= r.limit && r.total >= r.items.length && r.hasMore === (r.total > r.page * r.limit));
const learningReplySchema = z.object({
  ...base, kind: z.literal('learning_progress'),
  status: z.enum(['found', 'empty', 'page_empty', 'needs_clarification']),
  result: z.discriminatedUnion('scope', [
    overviewSchema, detailSchema, selectionSchema, z.object({ scope: z.literal('not_owned') }),
  ]),
}).refine(({ status, result: r }) => {
  if (r.scope === 'not_owned') return status === 'empty';
  if (r.scope === 'overview') return status === (r.totalCourses ? 'found' : 'empty');
  if (r.scope === 'course') return status === 'found';
  return r.total > 0 && status === (r.items.length ? 'needs_clarification' : 'page_empty');
}, { message: 'Inconsistent progress reply' });

export const chatbotReplySchema = z.union([
  chatbotSearchReplySchema, myCoursesReplySchema, learningReplySchema,
  z.object({ ...base, kind: z.literal('clarification'), status: z.literal('needs_clarification') }),
]);
export type ChatbotReply = z.infer<typeof chatbotReplySchema>;
export type ChatbotSearchReply = z.infer<typeof chatbotSearchReplySchema>;
export type ChatbotCourse = z.infer<typeof courseSchema>;
export type ChatbotOwnedCourse = z.infer<typeof chatbotOwnedCourseSchema>;
export type ChatbotPersonalReply = z.infer<typeof myCoursesReplySchema> | z.infer<typeof learningReplySchema>;

export interface ChatbotFailure {
  message: string;
  retryable: boolean;
  requiresLogin: boolean;
  retryAt?: number;
  requestId?: string;
  resetContext?: boolean;
}

export type ChatbotTurn = {
  id: string;
  message: string;
} & (
  | { status: 'pending' }
  | { status: 'success'; reply: ChatbotReply }
  | { status: 'error'; error: ChatbotFailure }
);
