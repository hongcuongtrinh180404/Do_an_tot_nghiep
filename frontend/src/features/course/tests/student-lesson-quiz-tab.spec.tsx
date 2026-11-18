// @vitest-environment jsdom

import { act, createElement, StrictMode, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizQuestionTypeEnum, type IStudentLessonQuiz } from 'share-lib';
import { StudentLessonQuizTab } from '../components/player/tabs/student-lesson-quiz-tab';
import { quizPracticeKey } from '../components/player/use-lesson-quiz-practice';

vi.mock('@/components/ui/icon', () => ({
  Icon: (props: Record<string, unknown>) => createElement('span', { 'aria-label': props['aria-label'], 'aria-hidden': props['aria-hidden'] }),
}));

type Props = ComponentProps<typeof StudentLessonQuizTab>;
let props: Props;
let host: HTMLDivElement;
let root: Root;

function question(id = 'q1', answered = false): IStudentLessonQuiz {
  return {
    id, lessonId: 'lesson', revision: `revision-${id}`, timestamp: 70, order: 1,
    question: `Nội dung câu hỏi ${id}`, questionType: QuizQuestionTypeEnum.SINGLE,
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase(), text: `Phương án ${id}` })),
    answer: answered ? {
      quizId: id, quizRevision: `revision-${id}`, selectedOptionIds: ['b'], isCorrect: false,
      correctOptionIds: ['a'], submittedAt: '2026-11-17T00:00:00Z',
    } : null,
    explanation: answered ? `Lời giải ${id}` : null,
    ...(answered ? { explanationTimestamp: 75 } : {}),
  };
}

function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  act(() => root.render(createElement(StrictMode, null, createElement(StudentLessonQuizTab, props))));
}

function remount() {
  act(() => root.unmount());
  root = createRoot(host);
  render();
}

function card(id = 'q1') {
  return host.querySelector<HTMLElement>(`[data-student-quiz="${id}"]`)!;
}

function option(id: string, quizId = 'q1') {
  return card(quizId).querySelector<HTMLButtonElement>(`button[data-option-id="${id}"]`)!;
}

function check(quizId = 'q1') {
  return card(quizId).querySelector<HTMLButtonElement>('[data-quiz-check]')!;
}

function reset() {
  act(() => host.querySelector<HTMLButtonElement>('[data-quiz-reset]')!.click());
}

function expectNoFeedback() {
  expect(host.querySelector('[data-quiz-feedback]')).toBeNull();
  expect(host.querySelector('[aria-label="Đáp án đúng"]')).toBeNull();
  expect(host.querySelector('[aria-label="Đáp án bạn chọn chưa đúng"]')).toBeNull();
  expect(host.querySelector('[aria-label="Giải thích"]')).toBeNull();
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // Node 25 also exposes localStorage; isolate the browser store explicitly in jsdom.
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => storage.clear(),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  props = {
    userId: 'student', courseId: 'course', lessonId: 'lesson', onSeek: vi.fn(),
    checkpoints: {
      quizzes: [question(), question('q2')], ready: true, isError: false, canSubmit: true,
      retry: vi.fn(), playExplanation: vi.fn(),
      checkAnswer: vi.fn(async (quiz, selected) => {
        const confirmed: IStudentLessonQuiz = {
          ...quiz, explanation: `Lời giải ${quiz.id}`, explanationTimestamp: 75,
          answer: {
            quizId: quiz.id, quizRevision: quiz.revision, selectedOptionIds: selected,
            isCorrect: selected.length === 1 && selected[0] === 'a', correctOptionIds: ['a'],
            submittedAt: '2026-11-17T00:00:00Z',
          },
        };
        props = { ...props, checkpoints: {
          ...props.checkpoints!, quizzes: props.checkpoints!.quizzes.map((old) => old.id === quiz.id ? confirmed : old),
        } };
        root.render(createElement(StrictMode, null, createElement(StudentLessonQuizTab, props)));
        return confirmed;
      }),
    },
  };
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Inline learner quiz', () => {
  it('starts with all four options visible and no Check button, answer colours or explanation', () => {
    render();
    expect(card().querySelectorAll('[data-option-id]')).toHaveLength(4);
    expect(host.querySelector('[data-quiz-check]')).toBeNull();
    expect(host.querySelector('[data-quiz-reset]')).toBeNull();
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toBe('Đã hoàn thành: 0/2 câu');
    expect(option('a').classList.contains('bg-white')).toBe(true);
    expectNoFeedback();
  });

  it('allows changing the selected option independently before checking', () => {
    render();
    act(() => option('b').click());
    expect(check().textContent).toBe('Check');
    expect(option('b').classList.contains('border-sky-600')).toBe(true);
    act(() => option('c').click());
    expect(option('b').getAttribute('aria-pressed')).toBe('false');
    expect(option('c').getAttribute('aria-pressed')).toBe('true');
    expect(option('a', 'q2').getAttribute('aria-pressed')).toBe('false');
    expectNoFeedback();
  });

  it('reveals a wrong selection, the correct option and explanation only after a saved Check', async () => {
    render();
    act(() => option('b').click());
    await act(async () => check().click());
    expect(props.checkpoints!.checkAnswer).toHaveBeenCalledWith(question(), ['b']);
    expect(option('b').classList.contains('border-rose-600')).toBe(true);
    expect(option('a').classList.contains('border-emerald-600')).toBe(true);
    expect(option('a').disabled).toBe(true);
    expect(check()).toBeNull();
    expect(card().querySelector('[aria-label="Giải thích"]')?.textContent).toContain('01:15Giải thích: Lời giải q1');
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toBe('Đã hoàn thành: 1/2 câu');
    expect(option('a', 'q2').disabled).toBe(false);
  });

  it('shows correct feedback and only the correct choice in emerald', async () => {
    render();
    act(() => option('a').click());
    await act(async () => check().click());
    expect(card().textContent).toContain('Bạn đã trả lời đúng.');
    expect(card().querySelectorAll('[aria-label="Đáp án đúng"]')).toHaveLength(1);
    expect(card().querySelector('[aria-label="Đáp án bạn chọn chưa đúng"]')).toBeNull();
  });

  it('keeps a failed Check retryable and does not grant completion', async () => {
    props.checkpoints!.checkAnswer = vi.fn().mockRejectedValueOnce(new Error('Không thể gửi câu trả lời.'));
    render();
    act(() => option('b').click());
    await act(async () => check().click());
    expect(card().querySelector('[role="alert"]')?.textContent).toContain('Không thể gửi');
    expect(check().disabled).toBe(false);
    expect(option('a').disabled).toBe(false);
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toContain('0/2');
    expectNoFeedback();
  });

  it('prevents double Check and disables reset until the pending answer is confirmed', async () => {
    let resolve!: (quiz: IStudentLessonQuiz) => void;
    props.checkpoints!.quizzes = [question(), question('q2', true)];
    props.checkpoints!.checkAnswer = vi.fn(() => new Promise<IStudentLessonQuiz>((done) => { resolve = done; }));
    render();
    act(() => option('a').click());
    act(() => { check().click(); check().click(); });
    expect(props.checkpoints!.checkAnswer).toHaveBeenCalledOnce();
    expect(check().disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>('[data-quiz-reset]')?.disabled).toBe(true);
    expect(option('b').disabled).toBe(true);
    await act(async () => resolve(question('q1', true)));
  });

  it('resets every card without changing server completion, including after remount or polling', () => {
    props.checkpoints!.quizzes = [question('q1', true), question('q2', true)];
    render();
    reset();
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toContain('2/2');
    expectNoFeedback();
    expect(host.querySelector('[data-quiz-check]')).toBeNull();
    expect(host.querySelector('[data-quiz-reset]')).toBeNull();
    expect(option('b').getAttribute('aria-pressed')).toBe('false');
    remount();
    expectNoFeedback();
    expect(option('a').disabled).toBe(false);
    render({ checkpoints: { ...props.checkpoints!, quizzes: structuredClone(props.checkpoints!.quizzes) } });
    expectNoFeedback();
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toContain('2/2');
  });

  it('grades the new practice selection rather than the immutable original result, without resubmitting', async () => {
    props.checkpoints!.quizzes = [question('q1', true), question('q2', true)];
    render();
    reset();
    act(() => option('a').click());
    await act(async () => check().click());
    expect(card().textContent).toContain('Bạn đã trả lời đúng.');
    expect(props.checkpoints!.checkAnswer).not.toHaveBeenCalled();
    expect(props.checkpoints!.quizzes[0].answer?.selectedOptionIds).toEqual(['b']);
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toContain('2/2');
    remount();
    expect(card().textContent).toContain('Bạn đã trả lời đúng.');
    expect(option('a').getAttribute('aria-pressed')).toBe('true');
    expect(card('q2').querySelector('[data-quiz-feedback]')).toBeNull();
  });

  it('preserves unfinished selections and scopes practice to the account, lesson and revision', () => {
    render();
    act(() => option('c').click());
    remount();
    expect(option('c').getAttribute('aria-pressed')).toBe('true');
    render({ userId: 'other-student' });
    expect(option('c').getAttribute('aria-pressed')).toBe('false');
    render({ userId: 'student', lessonId: 'other-lesson' });
    expect(option('c').getAttribute('aria-pressed')).toBe('false');
    render({ lessonId: 'lesson', checkpoints: { ...props.checkpoints!, quizzes: [{ ...question(), revision: 'updated-revision' }] } });
    expect(option('c').getAttribute('aria-pressed')).toBe('false');
    expectNoFeedback();
  });

  it('cannot grant completion or reveal an answer from forged browser storage', () => {
    window.localStorage.setItem(quizPracticeKey('student', 'course', 'lesson'), JSON.stringify({
      [JSON.stringify(['q1', 'revision-q1'])]: { selectedOptionIds: ['a'], checked: true },
    }));
    render();
    expectNoFeedback();
    expect(check().disabled).toBe(false);
    expect(host.querySelector('[data-quiz-completed]')?.textContent).toContain('0/2');
  });

  it('handles corrupt browser storage without crashing or exposing answers', () => {
    window.localStorage.setItem(quizPracticeKey('student', 'course', 'lesson'), '{malformed');
    render();
    expectNoFeedback();
    expect(option('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('does not show a missing explanation badge but supports the valid 00:00 cue', () => {
    props.checkpoints!.quizzes = [{ ...question('q1', true), explanationTimestamp: 0 }];
    render();
    const play = card().querySelector<HTMLButtonElement>('[aria-label="Nghe lại phần giải thích tại 00:00"]')!;
    act(() => play.click());
    expect(props.checkpoints!.playExplanation).toHaveBeenCalledWith(0);
    render({ checkpoints: { ...props.checkpoints!, quizzes: [{ ...question('q1', true), explanationTimestamp: null }] } });
    expect(card().querySelector('[aria-label="Giải thích"] button')).toBeNull();
    expect(card().textContent).toContain('Giải thích: Lời giải q1');
  });

  it.each([null, '', '   '])('does not render an empty explanation frame: %s', (explanation) => {
    props.checkpoints!.quizzes = [{ ...question('q1', true), explanation, explanationTimestamp: null }];
    render();
    expect(card().querySelector('[aria-label="Giải thích"]')).toBeNull();
  });

  it('preserves support for existing multiple-answer questions', async () => {
    const quiz = {
      ...question('q1', true), questionType: QuizQuestionTypeEnum.MULTIPLE,
      answer: { ...question('q1', true).answer!, correctOptionIds: ['a', 'c'] },
    };
    props.checkpoints!.quizzes = [quiz];
    render();
    reset();
    act(() => { option('a').click(); option('c').click(); });
    await act(async () => check().click());
    expect(card().textContent).toContain('Bạn đã trả lời đúng.');
    expect(card().querySelectorAll('[aria-label="Đáp án đúng"]')).toHaveLength(2);
  });

  it('provides loading, error, empty and unenrolled states', () => {
    render({ checkpoints: { ...props.checkpoints!, ready: false } });
    expect(host.textContent).toContain('Đang tải câu hỏi');
    render({ checkpoints: { ...props.checkpoints!, isError: true } });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Không tải được');
    act(() => host.querySelector('button')!.click());
    expect(props.checkpoints!.retry).toHaveBeenCalledOnce();
    render({ checkpoints: { ...props.checkpoints!, isError: false, ready: true, quizzes: [] } });
    expect(host.textContent).toContain('Bài học chưa có câu hỏi');
    render({ checkpoints: { ...props.checkpoints!, quizzes: [question()], canSubmit: false } });
    expect(host.textContent).toContain('Đăng ký khóa học');
    expect(option('a').disabled).toBe(true);
  });
});
