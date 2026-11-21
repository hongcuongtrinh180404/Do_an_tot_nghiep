// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningStatusEnum } from 'share-lib';
import { chatbotReplySchema, type ChatbotPersonalReply, type ChatbotOwnedCourse } from '../chatbot.contract';
import { PersonalLearningReply } from '../components/personal-learning-reply';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => createElement('a', { href }, children),
}));
const id = '0123456789abcdef01234567';
const lessonId = '0123456789abcdef01234568';
const course: ChatbotOwnedCourse = {
  id, title: 'Python thực hành', enrolledAt: '2026-11-20T00:00:00.000Z',
  url: `/courses/${id}`, resumeUrl: `/courses/${id}/lessons/${lessonId}`,
  progress: { status: LearningStatusEnum.IN_PROGRESS, progressPercent: 40, completedLessons: 2, totalLessons: 5,
    watchedMs: 120000, lastLessonId: lessonId, lastPositionSeconds: 85 },
};
const base = { requestId: '65ac3483-7075-48e3-8bbe-4c3a6eb9cced', answer: 'Dữ liệu thật.', context: 'signed-v2' };
type ProgressReply = Extract<ChatbotPersonalReply, { kind: 'learning_progress' }>;
const detail = (): ProgressReply => ({
  ...base, kind: 'learning_progress', status: 'found',
  result: { scope: 'course', course: structuredClone(course), remainingLessons: 3, lastLessonTitle: 'Vòng lặp' },
});
const selection = (): ProgressReply => ({
  ...base, kind: 'learning_progress', status: 'needs_clarification',
  result: { scope: 'selection', keyword: 'Python', items: [{ id, title: course.title }], total: 2, page: 1, limit: 1, hasMore: true },
});

describe('Personal reply schema', () => {
  it('accepts real detail/selection and strips unrelated private fields', () => {
    expect(chatbotReplySchema.parse(detail())).toEqual(detail());
    expect(chatbotReplySchema.parse(selection())).toEqual(selection());
    const response = detail();
    if (response.result.scope !== 'course') throw new Error('Expected detail');
    Object.assign(response.result.course.progress, { sessionId: 'secret', videoUrl: 'secret' });
    expect(JSON.stringify(chatbotReplySchema.parse(response))).not.toContain('secret');
  });
  it.each(['javascript:alert(1)', '//evil.example', `/courses/${lessonId}/lessons/${lessonId}`, `/courses/${id}/lessons/${id}`])(
    'rejects a mismatched or unsafe resume URL %s', (url) => {
      const response = detail();
      if (response.result.scope !== 'course') throw new Error('Expected detail');
      response.result.course.resumeUrl = url;
      expect(chatbotReplySchema.safeParse(response).success).toBe(false);
    },
  );
  it('rejects false completion ratios, impossible totals and unknown reply kinds', () => {
    const response = detail();
    if (response.result.scope !== 'course') throw new Error('Expected detail');
    response.result.course.progress.progressPercent = 100;
    expect(chatbotReplySchema.safeParse(response).success).toBe(false);
    expect(chatbotReplySchema.safeParse({ ...base, kind: 'learning_progress', status: 'found',
      result: { scope: 'overview', totalCourses: 5, notStarted: 1, inProgress: 1, completed: 1 } }).success).toBe(false);
    expect(chatbotReplySchema.safeParse({ ...detail(), kind: 'unknown' }).success).toBe(false);
  });
});

describe('Personal learning cards', () => {
  let host: HTMLDivElement;
  let root: Root;
  const onAsk = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    onAsk.mockReset();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  function render(reply: ChatbotPersonalReply, disabled = false) {
    act(() => root.render(createElement(PersonalLearningReply, { reply, disabled, onAsk, onNavigate: vi.fn() })));
  }
  it('shows real counts, progress and the supported resume link', () => {
    render(detail());
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');
    expect(host.textContent).toContain('2/5 bài video hoàn thành');
    expect(host.textContent).toContain('Vòng lặp · 1:25');
    expect(host.querySelector('a')?.getAttribute('href')).toBe(course.resumeUrl);
  });
  it('does not render a fake zero progress bar for a course without video lessons', () => {
    const response = detail();
    if (response.result.scope !== 'course') throw new Error('Expected detail');
    response.result.course.progress = { ...course.progress, totalLessons: 0, completedLessons: 0,
      progressPercent: null, status: LearningStatusEnum.NOT_STARTED, lastLessonId: null, lastPositionSeconds: 0 };
    response.result.course.resumeUrl = null;
    response.result.lastLessonTitle = null;
    response.result.remainingLessons = 0;
    render(response);
    expect(host.textContent).toContain('Chưa xác định');
    expect(host.querySelector('[role="progressbar"]')).toBeNull();
  });
  it('selects a numbered candidate, while historical/blocked selection buttons are disabled', () => {
    render(selection());
    act(() => host.querySelector('button')!.click());
    expect(onAsk).toHaveBeenCalledExactlyOnceWith('Xem tiến độ khóa thứ 1');
    render(selection(), true);
    expect(host.querySelector('button')?.disabled).toBe(true);
  });
  it('renders untrusted names as text and overview counts as actual zero values', () => {
    const response = selection();
    if (response.result.scope !== 'selection') throw new Error('Expected selection');
    response.result.items[0].title = '<img src=x onerror=alert(1)>';
    render(response);
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('<img');
    render({ ...base, kind: 'learning_progress', status: 'empty',
      result: { scope: 'overview', totalCourses: 0, notStarted: 0, inProgress: 0, completed: 0 } });
    expect([...host.querySelectorAll('dd')].map((node) => node.textContent)).toEqual(['0', '0', '0']);
  });
});
