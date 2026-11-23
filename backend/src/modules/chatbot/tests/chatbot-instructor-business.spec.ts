import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleEnum } from 'share-lib';
import type { InstructorRevenueReadRepository } from '../../payment/repositories/instructor-revenue-read.repository.js';
import { InstructorRevenueDataError } from '../../payment/utils/instructor-revenue.pipeline.js';
import { ChatbotInstructorBusinessService, CHATBOT_REVENUE_BUDGET_MS } from '../services/chatbot-instructor-business.service.js';
import { resolveBusinessArguments } from '../tools/instructor-business.contract.js';
import { previousBusinessPeriod, resolveBusinessPeriod } from '../tools/instructor-business.period.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';
import { ChatbotConversationService, providerConversationContext } from '../services/chatbot-conversation.service.js';
import { GetInstructorRevenueTool } from '../tools/get-instructor-revenue.tool.js';
import { GetInstructorSalesStatsTool } from '../tools/get-instructor-sales-stats.tool.js';
import type { ChatbotAiClient } from '../chatbot-ai.client.js';
import type { SearchCoursesTool } from '../tools/search-courses.tool.js';
import type { GetMyCoursesTool } from '../tools/get-my-courses.tool.js';
import type { GetMyLearningProgressTool } from '../tools/get-my-learning-progress.tool.js';
import { projectChatbotReply } from '../http/chatbot-response.projection.js';
import { ChatbotBusinessError } from '../tools/instructor-business.types.js';
import { mapChatbotHttpError } from '../http/chatbot-http.errors.js';

const userId = '0123456789abcdef00000001';
const courseId = '0123456789abcdef00000002';
const otherId = '0123456789abcdef00000003';
const now = new Date('2026-11-22T08:15:00.000Z');
const totals = { totalRevenue: 200000, instructorEarnings: 140000, platformCommission: 60000, successfulSales: 1, reconstructedOrders: 0 };
const empty = { totalRevenue: 0, instructorEarnings: 0, platformCommission: 0, successfulSales: 0, reconstructedOrders: 0 };
const context: ChatbotConversationContext = { mode: 'instructor_revenue', business: {
  query: { period: { timeRange: 'this_month' }, mode: 'revenue', metric: 'instructor_earnings', page: 1, limit: 2 },
} };

describe('Instructor business strict arguments and Vietnam periods', () => {
  it.each([
    { instructorId: userId }, { userId }, { sql: 'select *' }, { timeRange: 'unknown' },
    { timeRange: 'custom', startDate: '2026-11-01' }, { timeRange: 'today', endDate: '2026-11-01' },
    { courseId, courseName: 'React' }, { position: 0 }, { limit: 11 }, { limit: '2' },
    { action: 'next_page', page: 2 }, { timeRange: 'all' }, { __proto__: null, force: true },
  ])('rejects unsupported or ambiguous revenue arguments %j', (input) => {
    expect(() => resolveBusinessArguments(JSON.stringify(input), 'revenue', context)).toThrow();
  });
  it('uses a fresh month/all courses and refines only supplied filters', () => {
    const fresh = resolveBusinessArguments('{}', 'revenue', context);
    expect(fresh.query.limit).toBe(5);
    expect(fresh.query.period).toEqual({ timeRange: 'this_month' });
    const previous: ChatbotConversationContext = { ...context, business: {
      ...context.business!, query: { ...context.business!.query, courseId }, selectedCourseId: courseId,
    } };
    expect(resolveBusinessArguments('{"action":"refine","timeRange":"last_month"}', 'revenue', previous).query)
      .toMatchObject({ courseId, period: { timeRange: 'last_month' }, limit: 2, page: 1 });
    expect(resolveBusinessArguments('{"action":"refine","allCourses":true}', 'revenue', previous).query.courseId).toBeUndefined();
    // "Tất cả khóa thì sao?" is a refinement even when the model omits action.
    expect(resolveBusinessArguments('{"allCourses":true}', 'revenue', previous).query.courseId).toBeUndefined();
    expect(() => resolveBusinessArguments('{"action":"refine"}', 'revenue')).toThrow();
  });
  it('normalizes a revenue follow-up to net-earnings context even after a sales comparison', () => {
    const sales: ChatbotConversationContext = { mode: 'instructor_sales_stats', business: {
      query: { period: { timeRange: 'last_month' }, mode: 'compare', metric: 'successful_sales',
        courseId, page: 2, limit: 3 },
    } };
    expect(resolveBusinessArguments('{"action":"refine"}', 'revenue', sales).query)
      .toMatchObject({ mode: 'revenue', metric: 'instructor_earnings', courseId, page: 1, limit: 3 });
  });
  it('does not accept comparison controls on revenue or course selectors on a ranking', () => {
    expect(() => resolveBusinessArguments('{"mode":"compare"}', 'revenue')).toThrow();
    expect(() => resolveBusinessArguments('{"mode":"top_courses","courseName":"React"}', 'stats')).toThrow();
    expect(() => resolveBusinessArguments('{"mode":"sales_count","metric":"successful_sales"}', 'stats')).toThrow();
  });
  it('covers today, Monday-based weeks, rolling calendar days and an inclusive custom end', () => {
    expect(resolveBusinessPeriod({ timeRange: 'today' }, now)).toMatchObject({
      startAt: '2026-11-21T17:00:00.000Z', endAtExclusive: now.toISOString(), isPartial: true,
    });
    expect(resolveBusinessPeriod({ timeRange: 'this_week' }, now).startDate).toBe('2026-11-16');
    expect(resolveBusinessPeriod({ timeRange: '7days' }, now).startDate).toBe('2026-11-16');
    expect(resolveBusinessPeriod({ timeRange: 'custom', startDate: '2026-11-01', endDate: '2026-11-20' }, now))
      .toMatchObject({ startAt: '2026-10-31T17:00:00.000Z', endAtExclusive: '2026-11-20T17:00:00.000Z', isPartial: false });
  });
  it('compares month-to-date with the ENTIRE previous calendar month, including January/year boundaries', () => {
    const current = resolveBusinessPeriod({ timeRange: 'this_month' }, now);
    expect(previousBusinessPeriod({ timeRange: 'this_month' }, current, now)).toMatchObject({
      startDate: '2026-10-01', endDate: '2026-10-31', isPartial: false,
    });
    const january = new Date('2027-01-02T01:00:00Z');
    expect(previousBusinessPeriod({ timeRange: 'this_month' },
      resolveBusinessPeriod({ timeRange: 'this_month' }, january), january))
      .toMatchObject({ startDate: '2026-12-01', endDate: '2026-12-31' });
  });
  it.each([
    ['2026-02-30', '2026-03-01'], ['2026-11-20', '2026-11-01'],
    ['2026-12-01', '2026-12-02'], ['2024-01-01', '2026-11-01'],
  ])('never normalizes invalid, reversed, future-only or excessive custom dates %s', (startDate, endDate) => {
    expect(() => resolveBusinessPeriod({ timeRange: 'custom', startDate, endDate }, now)).toThrow();
  });
  it('keeps leap days and the previous equally sized custom period', () => {
    expect(resolveBusinessPeriod({ timeRange: 'custom', startDate: '2024-02-29', endDate: '2024-02-29' }, now).startDate).toBe('2024-02-29');
    const input = { timeRange: 'custom' as const, startDate: '2026-11-01', endDate: '2026-11-20' };
    expect(previousBusinessPeriod(input, resolveBusinessPeriod(input, now), now))
      .toMatchObject({ startDate: '2026-10-12', endDate: '2026-10-31' });
  });
});

describe('Instructor business authorization, context, complete reads and lifecycle', () => {
  const reads = { canRead: vi.fn(), courses: vi.fn(), summary: vi.fn(), compare: vi.fn(), topCourses: vi.fn() };
  const service = new ChatbotInstructorBusinessService(reads as unknown as InstructorRevenueReadRepository);
  const ask = (args: Record<string, unknown>, previous?: ChatbotConversationContext, tool: 'revenue' | 'stats' = 'revenue', question = 'Câu hỏi') =>
    service.execute(tool, JSON.stringify(args), userId, question, undefined, previous, now);
  beforeEach(() => {
    vi.resetAllMocks();
    reads.canRead.mockResolvedValue(true);
    reads.summary.mockResolvedValue(totals);
    reads.compare.mockResolvedValue([totals, empty]);
    reads.courses.mockImplementation(async (_userId, options) => ({
      items: [{ id: options.courseId ?? courseId, title: 'React riêng tư' }], total: 1,
    }));
    reads.topCourses.mockResolvedValue({ totals, items: [{ id: courseId, title: 'React riêng tư', rank: 1, ...totals }], total: 1, topTiedCount: 1 });
  });
  afterEach(() => vi.useRealTimers());

  it('rechecks the live account, passes the caller separately and returns no userId in facts', async () => {
    const reply = await ask({});
    expect(reads.canRead).toHaveBeenCalledTimes(2);
    expect(reads.summary).toHaveBeenCalledExactlyOnceWith(userId, new Date('2026-10-31T17:00:00Z'), now, undefined);
    expect(reply.result).toMatchObject({ scope: 'revenue', totals });
    expect(JSON.stringify(reply.result)).not.toContain(userId);
  });
  it('fails before reading finances for a student, deactivated account or revoked role', async () => {
    reads.canRead.mockResolvedValue(false);
    await expect(ask({})).rejects.toMatchObject({ code: 'CHATBOT_INSTRUCTOR_FORBIDDEN' });
    expect(reads.summary).not.toHaveBeenCalled();
    reads.canRead.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(ask({})).rejects.toMatchObject({ code: 'CHATBOT_INSTRUCTOR_FORBIDDEN' });
  });
  it('requires selection of ambiguous taught names, preserves pending dates and resolves position fresh', async () => {
    reads.courses.mockResolvedValueOnce({ items: [{ id: courseId, title: 'React 1' }, { id: otherId, title: 'React 2' }], total: 3 });
    const first = await ask({ courseName: 'React', timeRange: 'last_month', limit: 2 });
    expect(first.result.scope).toBe('selection');
    expect(reads.summary).not.toHaveBeenCalled();
    const next = await ask({ action: 'refine', position: 2 }, first.nextContext);
    expect(reads.courses).toHaveBeenLastCalledWith(userId, { courseId: otherId, page: 1, limit: 1 });
    expect(next.nextContext.business?.query.period.timeRange).toBe('last_month');
    expect(next.nextContext.business?.selectedCourseId).toBe(otherId);
  });
  it('paginates selection and ranks using the last list, not stale filters or a learner list', async () => {
    reads.courses.mockResolvedValueOnce({ items: [{ id: courseId, title: 'React 1' }], total: 3 });
    const first = await ask({ courseName: 'React', limit: 1 });
    await ask({ action: 'next_page' }, first.nextContext);
    expect(reads.courses).toHaveBeenLastCalledWith(userId, { keyword: 'React', page: 2, limit: 1 });
    await expect(ask({ current: true })).rejects.toMatchObject({ reason: 'missing_business_context' });
    const top = await ask({ mode: 'top_courses' }, undefined, 'stats');
    const detail = await ask({ action: 'refine', position: 1 }, top.nextContext);
    expect(detail.nextContext.business?.selectedCourseId).toBe(courseId);
    expect(detail.nextContext.list?.kind).toBe('business_top');
    await expect(ask({ action: 'next_page' }, detail.nextContext)).rejects.toMatchObject({ reason: 'no_more_business' });
  });
  it('can continue the original ranking or ambiguous list after inspecting a course', async () => {
    reads.topCourses.mockResolvedValueOnce({ totals, items: [{ id: courseId, title: 'React', rank: 1, ...totals }], total: 3, topTiedCount: 1 });
    const top = await ask({ mode: 'top_courses', limit: 1 }, undefined, 'stats');
    const detail = await ask({ action: 'refine', position: 1 }, top.nextContext);
    await ask({ action: 'next_page' }, detail.nextContext, 'stats');
    expect(reads.topCourses).toHaveBeenLastCalledWith(userId, expect.any(Date), now, 2, 1);
    reads.courses.mockResolvedValueOnce({ items: [{ id: courseId, title: 'React' }], total: 3 });
    const selection = await ask({ courseName: 'React', limit: 1 });
    const chosen = await ask({ action: 'refine', position: 1 }, selection.nextContext);
    await ask({ action: 'next_page' }, chosen.nextContext);
    expect(reads.courses).toHaveBeenLastCalledWith(userId, { keyword: 'React', page: 2, limit: 1 });
  });
  it('does not expose facts for a made-up ID, another instructor or revoked course authorization', async () => {
    await expect(ask({ courseId })).rejects.toMatchObject({ reason: 'missing_business_course' });
    expect(reads.courses).not.toHaveBeenCalled();
    reads.courses.mockResolvedValueOnce({ items: [], total: 0 });
    expect((await ask({ courseId }, undefined, 'revenue', courseId)).result).toMatchObject({ scope: 'not_owned', course: null });
    expect(reads.summary).not.toHaveBeenCalled();
  });
  it('returns new growth without Infinity and computes declines with a defined baseline', async () => {
    const fresh = await ask({ mode: 'compare' }, undefined, 'stats');
    expect(fresh.result).toMatchObject({ scope: 'compare', change: { absolute: 140000, percent: null, direction: 'new' },
      previousPeriod: { startDate: '2026-10-01', endDate: '2026-10-31' } });
    reads.compare.mockResolvedValueOnce([empty, totals]);
    expect((await ask({ mode: 'compare' }, undefined, 'stats')).result)
      .toMatchObject({ change: { absolute: -140000, percent: -100, direction: 'down' } });
    reads.compare.mockResolvedValueOnce([empty, empty]);
    expect((await ask({ mode: 'compare' }, undefined, 'stats')).result)
      .toMatchObject({ change: { absolute: 0, percent: 0, direction: 'unchanged' } });
  });
  it('fails closed on incomplete stored money/dates and does not turn DB failures into zeros', async () => {
    reads.summary.mockRejectedValueOnce(new InstructorRevenueDataError('invalid_money'));
    await expect(ask({})).rejects.toMatchObject({ code: 'CHATBOT_REVENUE_DATA_INCOMPLETE' });
    reads.summary.mockRejectedValueOnce(new Error('private-database-response'));
    await expect(ask({})).rejects.toMatchObject({ code: 'CHATBOT_REVENUE_UNAVAILABLE' });
  });
  it('bounds a stalled database read by 8 seconds and releases its timer', async () => {
    vi.useFakeTimers();
    reads.canRead.mockImplementationOnce(() => new Promise(() => {}));
    const rejected = expect(ask({})).rejects.toMatchObject({ code: 'CHATBOT_REVENUE_UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(CHATBOT_REVENUE_BUDGET_MS);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    expect(reads.summary).not.toHaveBeenCalled();
  });
  it('does not start after cancellation or continue a scan after disconnect', async () => {
    await expect(service.execute('revenue', '{}', userId, '', AbortSignal.abort()))
      .rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    expect(reads.canRead).not.toHaveBeenCalled();
    let finish!: (value: boolean) => void;
    reads.canRead.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    const controller = new AbortController();
    const rejected = expect(service.execute('revenue', '{}', userId, '', controller.signal))
      .rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    controller.abort();
    await rejected;
    finish(true);
    await Promise.resolve();
    expect(reads.summary).not.toHaveBeenCalled();
  });
});

describe('Role-gated one-call dispatch, projection and safe financial errors', () => {
  const complete = vi.fn();
  const execute = vi.fn();
  const business = { execute } as unknown as ChatbotInstructorBusinessService;
  const service = new ChatbotConversationService({ complete } as unknown as ChatbotAiClient,
    { definition: { function: { name: 'search_courses' } } } as SearchCoursesTool,
    { definition: { function: { name: 'get_my_courses' } } } as GetMyCoursesTool,
    { definition: { function: { name: 'get_my_learning_progress' } } } as GetMyLearningProgressTool,
    new GetInstructorRevenueTool(business), new GetInstructorSalesStatsTool(business));
  beforeEach(() => {
    vi.resetAllMocks();
    complete.mockResolvedValue({ assistantMessage: { content: 'FAKE 999999999', tool_calls: [{
      function: { name: 'get_instructor_revenue', arguments: '{}' },
    }] } });
    execute.mockResolvedValue({ result: { scope: 'revenue', totals, course: null,
      period: resolveBusinessPeriod({ timeRange: 'this_month' }, now), asOf: now.toISOString(),
      currency: 'VND', timeZone: 'Asia/Ho_Chi_Minh' }, nextContext: context });
  });
  it('gives instructors/admins five definitions and never makes a second provider call with financial results', async () => {
    const reply = await service.respond('Thu nhập tháng này', { userId, role: RoleEnum.INSTRUCTOR });
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0][0].tools).toHaveLength(5);
    expect(reply.answer).not.toContain('FAKE');
    expect(execute).toHaveBeenCalledWith('revenue', '{}', userId, 'Thu nhập tháng này', undefined, undefined);
    await service.respond('Doanh thu', { userId, role: RoleEnum.ADMIN });
    expect(complete.mock.calls[1][0].tools).toHaveLength(5);
  });
  it('denies a provider-forged instructor function for students before business execution', async () => {
    await expect(service.respond('Thu nhập', { userId, role: RoleEnum.STUDENT }))
      .rejects.toMatchObject({ code: 'CHATBOT_INSTRUCTOR_FORBIDDEN' });
    expect(complete.mock.calls[0][0].tools).toHaveLength(3);
    expect(execute).not.toHaveBeenCalled();
  });
  it('does not send course IDs, caller IDs, revenue facts or raw context to the provider', () => {
    const state: ChatbotConversationContext = { ...context, business: {
      query: { ...context.business!.query, courseId }, selectedCourseId: courseId,
    } };
    const sent = JSON.stringify(providerConversationContext(state));
    for (const secret of [userId, courseId, 'instructorEarnings', '140000']) expect(sent).not.toContain(secret);
    expect(sent).toContain('hasCourseFilter');
  });
  it('drops unexpected nested private fields and never includes internal nextContext in HTTP output', async () => {
    const reply = await service.respond('Thu nhập', { userId, role: RoleEnum.INSTRUCTOR });
    if (reply.kind !== 'instructor_revenue') throw new Error('Expected revenue');
    Object.assign(reply.result, { orderCode: 'private-order', bankAccount: 'private-bank' });
    if (reply.result.scope === 'revenue') Object.assign(reply.result.totals, { studentEmail: 'private-email' });
    const projected = JSON.stringify(projectChatbotReply(reply));
    expect(projected).not.toContain('private-');
    expect(projected).not.toContain('nextContext');
  });
  it.each([
    ['CHATBOT_INSTRUCTOR_FORBIDDEN', 403], ['CHATBOT_REVENUE_DATA_INCOMPLETE', 422], ['CHATBOT_REVENUE_UNAVAILABLE', 503],
  ] as const)('maps %s without exposing provider or transaction bodies', (code, status) => {
    const mapped = mapChatbotHttpError(new ChatbotBusinessError(code), 'request-id');
    expect(mapped.getStatus()).toBe(status);
    expect(mapped.getResponse()).toMatchObject({ code, requestId: 'request-id' });
  });
});
