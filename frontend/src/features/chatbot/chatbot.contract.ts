import { z } from 'zod';
import { CourseLevelEnum } from 'share-lib';

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

export const chatbotReplySchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['found', 'empty', 'page_empty', 'needs_clarification']),
  answer: z.string().min(1),
  context: z.string().min(1).max(CHATBOT_CONTEXT_LIMIT).optional(),
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

export type ChatbotReply = z.infer<typeof chatbotReplySchema>;
export type ChatbotCourse = z.infer<typeof courseSchema>;

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
