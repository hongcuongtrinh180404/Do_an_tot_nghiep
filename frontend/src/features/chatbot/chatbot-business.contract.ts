import { z } from 'zod';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id = z.string().regex(/^[a-f\d]{24}$/i);
const course = z.object({ id, title: z.string().min(1) });
const date = z.iso.date();
const period = z.object({
  startDate: date, endDate: date, startAt: z.iso.datetime(), endAtExclusive: z.iso.datetime(), isPartial: z.boolean(),
}).refine((p) => {
  const start = Date.parse(p.startAt);
  const end = Date.parse(p.endAtExclusive);
  const day = (stamp: number) => new Date(stamp + 7 * 3600000).toISOString().slice(0, 10);
  return end >= start && end - start <= 366 * 86400000
    && p.startAt === new Date(`${p.startDate}T00:00:00+07:00`).toISOString()
    && day(p.isPartial ? end : end - 1) === p.endDate;
}, { message: 'Invalid instructor reporting period' });
export const chatbotBusinessTotalsSchema = z.object({
  totalRevenue: count, platformCommission: count, instructorEarnings: count,
  successfulSales: count, reconstructedOrders: count,
}).refine((r) => r.totalRevenue === r.platformCommission + r.instructorEarnings
  && r.reconstructedOrders <= r.successfulSales
  && (r.successfulSales !== 0 || r.totalRevenue === 0),
{ message: 'Inconsistent instructor revenue totals' });
const paging = {
  total: count, page: z.number().int().min(1).max(1000), limit: z.number().int().min(1).max(10), hasMore: z.boolean(),
};
const resultBase = {
  asOf: z.iso.datetime(), timeZone: z.literal('Asia/Ho_Chi_Minh'), currency: z.literal('VND'),
  period, course: course.nullable(),
};
const totals = chatbotBusinessTotalsSchema;
const summary = z.object({ ...resultBase, scope: z.enum(['revenue', 'sales_count']), totals });
const selection = z.object({
  ...resultBase, scope: z.literal('selection'), items: z.array(course).max(10), ...paging,
}).refine((r) => r.course === null && r.items.length <= r.limit && r.total >= r.items.length
  && r.hasMore === (r.total > r.page * r.limit)
  && new Set(r.items.map((c) => c.id)).size === r.items.length);
const top = z.object({
  ...resultBase, scope: z.literal('top_courses'), totals, ...paging, topTiedCount: count,
  items: z.array(course.extend({
    rank: z.number().int().positive(), ...chatbotBusinessTotalsSchema.shape,
  }).refine((r) => chatbotBusinessTotalsSchema.safeParse(r).success)).max(10),
}).refine((r) => r.course === null && r.items.length <= r.limit && r.total >= r.items.length
  && (r.total === 0 ? r.topTiedCount === 0 : r.topTiedCount > 0 && r.topTiedCount <= r.total)
  && r.hasMore === (r.total > r.page * r.limit)
  && new Set(r.items.map((c) => c.id)).size === r.items.length
  && r.items.reduce((sum, c) => sum + c.successfulSales, 0) <= r.totals.successfulSales
  && r.items.reduce((sum, c) => sum + c.instructorEarnings, 0) <= r.totals.instructorEarnings
  && r.items.every((c, index) => c.successfulSales > 0 && c.rank <= (r.page - 1) * r.limit + index + 1
    && (index === 0 || (c.successfulSales <= r.items[index - 1].successfulSales
      && (c.successfulSales === r.items[index - 1].successfulSales ? c.rank === r.items[index - 1].rank : c.rank > r.items[index - 1].rank)))));
const compare = z.object({
  ...resultBase, scope: z.literal('compare'),
  metric: z.enum(['instructor_earnings', 'successful_sales']),
  current: totals, previous: totals, previousPeriod: period,
  change: z.object({
    absolute: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
    percent: z.number().finite().nullable(), direction: z.enum(['up', 'down', 'unchanged', 'new']),
  }),
}).refine((r) => {
  const key = r.metric === 'instructor_earnings' ? 'instructorEarnings' : 'successfulSales';
  const absolute = r.current[key] - r.previous[key];
  const percent = r.previous[key] ? Math.round(absolute / r.previous[key] * 10000) / 100 : absolute === 0 ? 0 : null;
  const direction = absolute === 0 ? 'unchanged' : r.previous[key] === 0 ? 'new' : absolute > 0 ? 'up' : 'down';
  return r.change.absolute === absolute && r.change.percent === percent && r.change.direction === direction;
}, { message: 'Inconsistent instructor comparison' });

export const chatbotBusinessReplySchema = z.object({
  requestId: z.string().uuid(), answer: z.string().min(1), context: z.string().min(1).max(8192).optional(),
  kind: z.enum(['instructor_revenue', 'instructor_sales_stats']),
  status: z.enum(['found', 'empty', 'page_empty', 'needs_clarification']),
  result: z.discriminatedUnion('scope', [
    summary, selection, top, compare, z.object({ ...resultBase, scope: z.literal('not_owned') }),
  ]),
}).refine(({ kind, status, result: r }) => {
  if (Date.parse(r.period.endAtExclusive) > Date.parse(r.asOf)) return false;
  if (r.scope === 'not_owned') return r.course === null && status === 'empty';
  if (r.scope === 'selection') return r.total > 0 && status === (r.items.length ? 'needs_clarification' : 'page_empty');
  if ((kind === 'instructor_revenue') !== (r.scope === 'revenue')) return false;
  if (r.scope === 'top_courses') return status === (r.total ? r.items.length ? 'found' : 'page_empty' : 'empty');
  if (r.scope === 'compare') return Date.parse(r.previousPeriod.endAtExclusive) <= Date.parse(r.asOf)
    && status === (r.current.successfulSales || r.previous.successfulSales ? 'found' : 'empty');
  return status === (r.totals.successfulSales ? 'found' : 'empty');
}, { message: 'Inconsistent instructor business reply' });
export type ChatbotBusinessReply = z.infer<typeof chatbotBusinessReplySchema>;
