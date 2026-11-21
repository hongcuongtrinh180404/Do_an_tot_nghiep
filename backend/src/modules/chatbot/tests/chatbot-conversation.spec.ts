import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, LearningStatusEnum } from 'share-lib';
import type { ChatbotAiClient } from '../chatbot-ai.client.js';
import type { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import type { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import { ChatbotConversationService } from '../services/chatbot-conversation.service.js';
import { GetMyCoursesTool } from '../tools/get-my-courses.tool.js';
import { GetMyLearningProgressTool } from '../tools/get-my-learning-progress.tool.js';
import { SearchCoursesTool } from '../tools/search-courses.tool.js';
import { ChatbotLearningError, type ChatbotConversationContext, type ChatbotOwnedCourse } from '../tools/my-learning.types.js';
import { projectChatbotReply } from '../http/chatbot-response.projection.js';

const userId = '0123456789abcdef00000001';
const courseId = '0123456789abcdef00000002';
const otherId = '0123456789abcdef00000003';
const course: ChatbotOwnedCourse = {
  id: courseId, title: 'Khóa riêng có dữ liệu thật', enrolledAt: '2026-11-20T00:00:00.000Z',
  url: `/courses/${courseId}`, resumeUrl: null,
  progress: { status: LearningStatusEnum.IN_PROGRESS, progressPercent: 40, completedLessons: 2, totalLessons: 5,
    watchedMs: 120000, lastLessonId: null, lastPositionSeconds: 0 },
};
function completion(name: string, args: Record<string, unknown>) {
  return { assistantMessage: {
    role: 'assistant', content: 'FAKE FACTS', tool_calls: [
      { id: 'one', type: 'function', function: { name, arguments: JSON.stringify(args) } },
    ],
  } };
}

describe('Three-tool conversation and account-bound resolution', () => {
  const complete = vi.fn();
  const list = vi.fn();
  const detail = vi.fn();
  const overview = vi.fn();
  const candidates = vi.fn();
  const search = vi.fn();
  const reads = { list, detail, overview, candidates } as unknown as ChatbotLearningReadService;
  const service = new ChatbotConversationService(
    { complete } as unknown as ChatbotAiClient,
    new SearchCoursesTool({ search } as unknown as PublicCourseSearchService),
    new GetMyCoursesTool(reads), new GetMyLearningProgressTool(reads),
  );
  const ask = (name: string, args: Record<string, unknown>, context?: ChatbotConversationContext, question = 'Câu hỏi') => {
    complete.mockResolvedValue(completion(name, args));
    return service.respond(question, { userId, context });
  };
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockImplementation(async (_user, filters) => ({
      filtersApplied: filters, items: [structuredClone(course)], total: 4, page: filters.page, limit: filters.limit, hasMore: true,
    }));
    detail.mockResolvedValue({ scope: 'course', course: structuredClone(course), remainingLessons: 3, lastLessonTitle: null });
    candidates.mockResolvedValue({ scope: 'selection', keyword: 'Python', items: [
      { id: courseId, title: 'Python thứ nhất' }, { id: otherId, title: 'Python thứ hai' },
    ], total: 3, page: 1, limit: 2, hasMore: true });
    overview.mockResolvedValue({ scope: 'overview', totalCourses: 3, notStarted: 1, inProgress: 1, completed: 1 });
    search.mockImplementation(async (filters) => ({
      filtersApplied: filters, items: [{ id: courseId, title: 'Catalog thật', price: 10000,
        level: CourseLevelEnum.BEGINNER, categoryName: null, url: `/courses/${courseId}` }],
      total: 1, page: filters.page, limit: filters.limit, hasMore: false, currency: 'VND',
    }));
  });

  it('carries the JWT caller separately and makes one AI call with exactly three tools', async () => {
    const reply = await ask('get_my_courses', { limit: 2 });
    expect(reply.kind).toBe('my_courses');
    expect(reply.answer).toContain(course.title);
    expect(reply.answer).not.toContain('FAKE');
    expect(list).toHaveBeenCalledWith(userId, { page: 1, limit: 2 }, undefined);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0][0].tools.map((tool: { function: { name: string } }) => tool.function.name))
      .toEqual(['search_courses', 'get_my_courses', 'get_my_learning_progress']);
  });
  it.each([0, 2, 3])('does not execute %i tool calls or display model-written facts', async (count) => {
    const response = completion('get_my_courses', {});
    response.assistantMessage.tool_calls = Array.from({ length: count }, (_value, index) => ({
      ...response.assistantMessage.tool_calls[0], id: `call-${index}`,
    }));
    complete.mockResolvedValueOnce(response);
    const reply = await service.respond('Khóa của tôi', { userId });
    expect(reply.kind).toBe('clarification');
    expect(reply.answer).not.toContain('FAKE');
    expect(list).not.toHaveBeenCalled();
    expect(detail).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
  it('rejects unknown functions without executing any business operation', async () => {
    expect((await ask('register_free_course', { courseId })).kind).toBe('clarification');
    expect(list).not.toHaveBeenCalled();
    expect(detail).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
  it('resolves a position to the last page and preserves the originating list after detail/refinement', async () => {
    const first = await ask('get_my_courses', { limit: 2, keyword: 'Python' });
    const selected = await ask('get_my_learning_progress', { scope: 'course', position: 1 }, first.nextContext);
    expect(detail).toHaveBeenLastCalledWith(userId, courseId, undefined);
    expect(selected.nextContext?.list).toEqual(first.nextContext?.list);
    await ask('get_my_learning_progress', { scope: 'course', current: true }, selected.nextContext);
    expect(detail).toHaveBeenCalledTimes(2);
    const refined = await ask('get_my_courses', { action: 'refine', learningStatus: 'NOT_STARTED' }, selected.nextContext);
    expect(list).toHaveBeenLastCalledWith(userId, { keyword: 'Python', learningStatus: 'NOT_STARTED', page: 1, limit: 2 }, undefined);
    expect(refined.nextContext?.selectedCourseId).toBeUndefined();
    await ask('get_my_courses', { action: 'next_page' }, refined.nextContext);
    expect(list.mock.calls.at(-1)?.[1].page).toBe(2);
  });
  it('asks for selection on ambiguous names and resolves the chosen row without repeating name search', async () => {
    const first = await ask('get_my_learning_progress', { scope: 'course', courseName: 'Python', limit: 2 });
    expect(first.status).toBe('needs_clarification');
    expect(first.nextContext?.list?.kind).toBe('selection');
    await ask('get_my_learning_progress', { scope: 'course', position: 2 }, first.nextContext);
    expect(detail).toHaveBeenCalledExactlyOnceWith(userId, otherId, undefined);
    expect(candidates).toHaveBeenCalledOnce();
    await ask('get_my_learning_progress', { scope: 'next_page' }, first.nextContext);
    expect(candidates).toHaveBeenLastCalledWith(userId, 'Python', 2, 2, undefined);
  });
  it('does not send owned titles, IDs, statistics or the caller ID to River', async () => {
    const first = await ask('get_my_courses', {});
    const second = await ask('get_my_learning_progress', { scope: 'course', position: 1 }, first.nextContext);
    await ask('get_my_learning_progress', { scope: 'course', current: true }, second.nextContext);
    const input = JSON.stringify(complete.mock.calls.at(-1)?.[0]);
    for (const value of [course.title, courseId, userId, 'watchedMs', 'progressPercent']) expect(input).not.toContain(value);
    expect(input).toContain('hasSelectedCourse');
  });
  it('rechecks progress and handles revoked ownership without stale facts', async () => {
    const first = await ask('get_my_courses', {});
    detail.mockResolvedValue({ scope: 'not_owned' });
    const reply = await ask('get_my_learning_progress', { scope: 'course', position: 1 }, first.nextContext);
    expect(reply).toMatchObject({ kind: 'learning_progress', status: 'empty', result: { scope: 'not_owned' } });
    expect(reply.answer).not.toContain(course.title);
    expect(reply.nextContext?.selectedCourseId).toBeUndefined();
  });
  it('requires explicit IDs and rejects selectors without a usable context', async () => {
    for (const args of [{ scope: 'course', courseId }, { scope: 'course', position: 2 }, { scope: 'course', current: true }]) {
      expect((await ask('get_my_learning_progress', args)).status).toBe('needs_clarification');
    }
    expect(detail).not.toHaveBeenCalled();
    await ask('get_my_learning_progress', { scope: 'course', courseId }, undefined, `Tiến độ /courses/${courseId}`);
    expect(detail).toHaveBeenCalledExactlyOnceWith(userId, courseId, undefined);
  });
  it('switches to a fresh catalog without inherited private filters, and overview resets selection', async () => {
    const first = await ask('get_my_courses', { keyword: 'Python', learningStatus: 'NOT_STARTED' });
    const reply = await ask('search_courses', { keyword: 'Yoga' }, first.nextContext);
    expect(search).toHaveBeenCalledExactlyOnceWith({ keyword: 'Yoga', page: 1, limit: 5, maxPriceExclusive: false });
    expect(reply.nextContext?.mode).toBe('catalog');
    expect((await ask('get_my_learning_progress', { scope: 'overview' }, reply.nextContext)).nextContext)
      .toEqual({ mode: 'learning_progress' });
  });
  it('does not paginate an unrelated old list after a newly named course', async () => {
    const first = await ask('get_my_courses', { keyword: 'Python', limit: 2 });
    candidates.mockResolvedValueOnce({ scope: 'selection', keyword: 'Yoga', items: [
      { id: otherId, title: 'Yoga' },
    ], total: 1, page: 1, limit: 5, hasMore: false });
    detail.mockResolvedValueOnce({ scope: 'course', course: { ...course, id: otherId },
      remainingLessons: 3, lastLessonTitle: null });
    const next = await ask('get_my_learning_progress', { scope: 'course', courseName: 'Yoga' }, first.nextContext);
    expect(next.nextContext?.list).toBeUndefined();
    expect(next.nextContext?.selectedCourseId).toBe(otherId);
    list.mockClear();
    expect((await ask('get_my_courses', { action: 'next_page' }, next.nextContext)).kind).toBe('clarification');
    expect(list).not.toHaveBeenCalled();
  });
  it('does not run a selection page outside the validated pagination bounds', async () => {
    const context: ChatbotConversationContext = { mode: 'learning_progress', list: {
      kind: 'selection', keyword: 'Python', page: 1000, limit: 1, hasMore: true, ids: [courseId],
    } };
    expect((await ask('get_my_learning_progress', { scope: 'next_page' }, context)).kind).toBe('clarification');
    expect(candidates).not.toHaveBeenCalled();
  });
  it('keeps a compatible originating list when a course on that page is chosen by name', async () => {
    const first = await ask('get_my_courses', { keyword: 'Python', limit: 2 });
    candidates.mockResolvedValueOnce({ scope: 'selection', keyword: 'Python cơ bản', items: [
      { id: courseId, title: 'Python cơ bản' },
    ], total: 1, page: 1, limit: 5, hasMore: false });
    const next = await ask('get_my_learning_progress', { scope: 'course', courseName: 'Python cơ bản' }, first.nextContext);
    expect(next.nextContext?.list).toEqual(first.nextContext?.list);
    expect(next.nextContext?.selectedCourseId).toBe(courseId);
  });
  it('does not turn DB errors into empty lists and does not execute after cancellation', async () => {
    list.mockRejectedValueOnce(new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE'));
    await expect(ask('get_my_courses', {})).rejects.toMatchObject({ code: 'CHATBOT_LEARNING_UNAVAILABLE' });
    complete.mockClear();
    await expect(service.respond('Khóa của tôi', { userId, signal: AbortSignal.abort() }))
      .rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    expect(complete).not.toHaveBeenCalled();
  });
  it('projects only allowlisted facts and regenerates links at the HTTP boundary', async () => {
    const reply = await ask('get_my_learning_progress', { scope: 'course', courseId }, undefined, courseId);
    if (reply.kind !== 'learning_progress' || reply.result.scope !== 'course') throw new Error('Expected detail');
    Object.assign(reply.result.course, { orderId: 'private-order', url: 'https://evil.example' });
    Object.assign(reply.result.course.progress, { sessionId: 'private-playback', lastMediaUrl: 'private-video' });
    Object.assign(reply, { reasoning_content: 'private-reasoning' });
    const projected = projectChatbotReply(reply);
    expect(JSON.stringify(projected)).not.toContain('private-');
    expect(projected).not.toHaveProperty('nextContext');
    expect(JSON.stringify(projected)).not.toContain('evil.example');
  });
});
