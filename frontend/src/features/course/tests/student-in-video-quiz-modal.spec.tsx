// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizQuestionTypeEnum, type IStudentLessonQuiz } from 'share-lib';
import { StudentInVideoQuizModal } from '../components/player/student-in-video-quiz-modal';

vi.mock('@/components/ui/icon', () => ({
  Icon: (props: Record<string, unknown>) => createElement('span', { 'aria-label': props['aria-label'], 'aria-hidden': props['aria-hidden'] }),
}));

type Props = ComponentProps<typeof StudentInVideoQuizModal>;

function question(id = 'q1', answered = false): IStudentLessonQuiz {
  return {
    id, lessonId: 'lesson', revision: `revision-${id}`, timestamp: 30, order: 1,
    question: `Câu hỏi ${id}`, questionType: QuizQuestionTypeEnum.SINGLE,
    options: [{ id: 'a', label: 'A', text: 'Phương án A' }, { id: 'b', label: 'B', text: 'Phương án B' }],
    answer: answered ? {
      quizId: id, quizRevision: `revision-${id}`, selectedOptionIds: ['b'],
      isCorrect: false, correctOptionIds: ['a'], submittedAt: '2026-11-17T00:00:00Z',
    } : null,
    explanation: answered ? `Lời giải ${id}\nDòng tiếp theo.` : null,
  };
}

let root: Root;
let container: HTMLDivElement;
let props: Props;

function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  act(() => root.render(createElement(StudentInVideoQuizModal, props)));
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find((node) => node.textContent?.trim() === label);
  expect(found, `Missing button: ${label}`).toBeDefined();
  return found!;
}

function expectHiddenAnswers() {
  expect(container.querySelector('[aria-label="Đáp án đúng"]')).toBeNull();
  expect(container.querySelector('[aria-label="Đáp án bạn chọn chưa đúng"]')).toBeNull();
  expect(container.querySelector('[aria-label="Giải thích"]')).toBeNull();
  expect(container.querySelector('.border-emerald-600, .border-destructive')).toBeNull();
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  props = {
    timestamp: 30, formatTime: () => '00:30', quizzes: [question()],
    required: true, canSubmit: true, submitting: false, error: '',
    onSubmit: vi.fn(async () => undefined), onClose: vi.fn(),
  };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('Learner answer review', () => {
  it('only offers answer review after a confirmed submission and reveals it on demand', async () => {
    render();
    expect(container.textContent).not.toContain('Xem đáp án');
    expect(button('Trả lời').disabled).toBe(true);
    act(() => button('B.Phương án B').click());
    await act(async () => button('Trả lời').click());
    expect(props.onSubmit).toHaveBeenCalledWith(question(), ['b']);
    expect(container.textContent).not.toContain('Xem đáp án');
    render({ submitting: true });
    expect(button('Trả lời').disabled).toBe(true);
    expectHiddenAnswers();

    render({ submitting: false, required: false, quizzes: [question('q1', true)] });
    expect(button('Xem đáp án').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button('Xem đáp án'));
    expect(button('B.Phương án B').getAttribute('aria-pressed')).toBe('true');
    expect(button('B.Phương án B').disabled).toBe(true);
    expectHiddenAnswers();
    expect(container.textContent).not.toContain('Lời giải q1');

    act(() => button('Xem đáp án').click());
    const toggle = button('Ẩn đáp án');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).not.toBeNull();
    expect(button('A.Phương án A').classList.contains('border-emerald-600')).toBe(true);
    expect(button('B.Phương án B').classList.contains('border-destructive')).toBe(true);
    expect(container.querySelectorAll('[aria-label="Đáp án đúng"]')).toHaveLength(1);
    expect(container.querySelector('[aria-label="Đáp án bạn chọn chưa đúng"]')).not.toBeNull();
    expect(container.textContent).toContain('Lời giải q1');

    act(() => toggle.click());
    expectHiddenAnswers();
    expect(button('Xem đáp án').getAttribute('aria-expanded')).toBe('false');
  });

  it('does not offer review after a failed submission', () => {
    render();
    act(() => button('A.Phương án A').click());
    render({ error: 'Không thể gửi câu trả lời. Vui lòng thử lại.' });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Không thể gửi');
    expect(container.textContent).not.toContain('Xem đáp án');
    expect(button('Trả lời').disabled).toBe(false);
    expectHiddenAnswers();
  });

  it.each([null, '', '   '])('shows correct options without an empty explanation section (%s)', (explanation) => {
    render({ quizzes: [{ ...question('q1', true), explanation }], required: false });
    act(() => button('Xem đáp án').click());
    expect(container.querySelectorAll('[aria-label="Đáp án đúng"]')).toHaveLength(1);
    expect(container.querySelector('[aria-label="Giải thích"]')).toBeNull();
  });

  it('reveals every correct option in a multiple-answer question, including a correct submission', () => {
    const quiz = question('q1', true);
    render({ required: false, quizzes: [{
      ...quiz, questionType: QuizQuestionTypeEnum.MULTIPLE,
      options: [...quiz.options, { id: 'c', label: 'C', text: 'Phương án C' }],
      answer: { ...quiz.answer!, selectedOptionIds: ['a', 'c'], correctOptionIds: ['a', 'c'], isCorrect: true },
    }] });
    expectHiddenAnswers();
    act(() => button('Xem đáp án').click());
    expect(container.querySelectorAll('[aria-label="Đáp án đúng"]')).toHaveLength(2);
    expect(container.textContent).toContain('Bạn đã trả lời đúng.');
  });

  it('resets disclosure between questions, and continuing does not require revealing answers', () => {
    render({ quizzes: [question('q1', true), question('q2', true)], required: false });
    act(() => button('Xem đáp án').click());
    expect(container.textContent).toContain('Lời giải q1');
    act(() => button('Câu tiếp theo').click());
    expect(container.textContent).toContain('Câu hỏi q2');
    expect(button('Xem đáp án').getAttribute('aria-expanded')).toBe('false');
    expectHiddenAnswers();
    act(() => button('Xem tiếp video').click());
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('keeps focus inside the quiz when advancing to an unanswered question, without stealing focus on polls', () => {
    render({ quizzes: [question('q1', true), question('q2')] });
    act(() => button('Câu tiếp theo').click());
    expect(document.activeElement).toBe(container.querySelector('[role="dialog"]'));
    act(() => button('A.Phương án A').focus());
    render({ quizzes: [question('q1', true), question('q2')] });
    expect(document.activeElement).toBe(button('A.Phương án A'));
  });

  it('does not carry a revealed answer over to a new revision of the same question', () => {
    render({ quizzes: [question('q1', true)], required: false });
    act(() => button('Xem đáp án').click());
    render({ quizzes: [{ ...question('q1', true), revision: 'new-revision' }] });
    expect(button('Xem đáp án').getAttribute('aria-expanded')).toBe('false');
    expectHiddenAnswers();
  });

  it('reopening a completed question starts with its answer hidden', () => {
    render({ quizzes: [question('q1', true)], required: false });
    act(() => button('Xem đáp án').click());
    act(() => root.render(null));
    render();
    expect(button('Xem đáp án').getAttribute('aria-expanded')).toBe('false');
    expectHiddenAnswers();
  });

  it('preserves immediate feedback in the instructor trial', () => {
    render({ quizzes: [question('q1', true)], required: false, isInstructorPreview: true });
    expect(container.textContent).toContain('Đáp án đúng được đánh dấu');
    expect(container.textContent).toContain('Lời giải q1');
    expect(container.textContent).not.toContain('Xem đáp án');
  });
});
