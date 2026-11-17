// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizQuestionTypeEnum, type ILessonQuiz } from 'share-lib';
import { Dialog, DialogPortal, DialogPortalContainerProvider, DialogTitle } from '@/components/ui/dialog';
import { CreateQuizMarkerModal } from '../components/player/create-quiz-marker-modal';
import { LessonQuizQuestionDialog } from '../components/player/lesson-quiz-question-dialog';

const { sync, save, deleteCluster } = vi.hoisted(() => ({
  sync: vi.fn(), save: vi.fn(), deleteCluster: vi.fn(),
}));
vi.mock('../api/lesson-quiz.api', () => ({
  useSyncLessonQuizzesMutation: () => ({ mutateAsync: sync, isPending: false }),
  useSaveLessonQuizMutation: () => ({ mutateAsync: save, isPending: false }),
  useDeleteLessonQuizClusterMutation: () => ({ mutateAsync: deleteCluster, isPending: false }),
  getLessonQuizErrorMessage: () => 'Không thể lưu câu hỏi.',
}));
vi.mock('@/components/ui/icon', () => ({
  Icon: () => createElement('span', { 'aria-hidden': true }),
}));

const question: ILessonQuiz = {
  id: 'saved-1', lessonId: 'lesson', order: 1, timestamp: 20, explanationTimestamp: 12,
  question: 'Câu hỏi đã có', questionType: QuizQuestionTypeEnum.SINGLE,
  options: [
    { id: 'a', label: 'A', text: 'Đúng', isCorrect: true },
    { id: 'b', label: 'B', text: 'Sai', isCorrect: false },
  ],
  explanation: 'Nội dung giải thích',
};
const secondQuestion: ILessonQuiz = { ...question, id: 'saved-2', order: 2, timestamp: 21, explanationTimestamp: 15 };
const formatTime = (seconds: number) => `00:${String(seconds).padStart(2, '0')}`;
let root: Root;
let host: HTMLDivElement;
let portalHost: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  sync.mockResolvedValue([]);
  save.mockResolvedValue(question);
  host = document.createElement('div');
  portalHost = document.createElement('div');
  document.body.append(host, portalHost);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  portalHost.remove();
  vi.unstubAllGlobals();
});

async function renderMarker(props: Partial<Parameters<typeof CreateQuizMarkerModal>[0]> = {}) {
  await act(async () => root.render(createElement(DialogPortalContainerProvider, { container: portalHost },
    createElement(CreateQuizMarkerModal, {
      canEdit: true, open: true, lessonId: 'lesson', timestamp: 20, duration: 120,
      formatTime, onOpenChange: vi.fn(), existingQuizzes: [question, secondQuestion], ...props,
    }),
  )));
}

function timeInput(label: string, part = 'Giây') {
  const input = portalHost.querySelector<HTMLInputElement>(`input[aria-label="${label} - ${part}"]`);
  expect(input, `${label} - ${part}`).not.toBeNull();
  return input!;
}

async function inputTime(label: string, value: string, part = 'Giây') {
  const input = timeInput(label, part);
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => input.blur());
}

async function clickButton(label: string) {
  const button = [...portalHost.querySelectorAll('button')].find((item) => item.textContent?.trim() === label);
  expect(button, label).toBeDefined();
  await act(async () => button!.click());
}

async function selectQuestion(index: number) {
  await act(async () => portalHost.querySelector<HTMLElement>(`[data-quiz-question-index="${index}"]`)!.click());
}

describe('Shared Quiz tab and timeline editor', () => {
  it('leaves dialogs outside the player scope on the default body portal', async () => {
    await act(async () => root.render(createElement(LessonQuizQuestionDialog, {
      lessonId: 'lesson', quiz: question, canEdit: true, duration: 120, onOpenChange: vi.fn(),
    })));
    expect(document.body.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
    expect(portalHost.querySelector('[data-slot="dialog-content"]')).toBeNull();
    expect(host.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });

  it('preserves the explicit null-container deferral supported by Base UI portals', async () => {
    await act(async () => root.render(createElement(DialogPortalContainerProvider, { container: portalHost },
      createElement(Dialog, { open: true },
        createElement(DialogPortal, { container: null },
          createElement(DialogTitle, null, 'Deferred popup'),
        ),
      ),
    )));
    expect(document.body.textContent).not.toContain('Deferred popup');
  });

  it.each([0, 45])('prefills a new question from the clicked %s-second timeline position', async (timestamp) => {
    await renderMarker({ timestamp, existingQuizzes: [] });
    expect(timeInput('Thời điểm xuất hiện').value).toBe(String(timestamp).padStart(2, '0'));
    expect(timeInput('Thời gian giải thích').value).toBe('');
  });

  it('retains independent times, IDs and unsaved values when switching between questions', async () => {
    await renderMarker();
    expect(timeInput('Thời điểm xuất hiện').value).toBe('20');
    expect(timeInput('Thời gian giải thích').value).toBe('12');
    await inputTime('Thời điểm xuất hiện', '45');
    expect(timeInput('Thời gian giải thích').value).toBe('12');
    await inputTime('Thời gian giải thích', '10');
    await selectQuestion(1);
    expect(timeInput('Thời điểm xuất hiện').value).toBe('21');
    expect(timeInput('Thời gian giải thích').value).toBe('15');
    await inputTime('Thời điểm xuất hiện', '00');
    await selectQuestion(0);
    expect(timeInput('Thời điểm xuất hiện').value).toBe('45');
    expect(timeInput('Thời gian giải thích').value).toBe('10');
    await clickButton('Lưu / Cập nhật câu hỏi');
    expect(sync).toHaveBeenCalledWith({
      timestamp: 20,
      questions: [
        expect.objectContaining({ id: 'saved-1', timestamp: 45, explanationTimestamp: 10 }),
        expect.objectContaining({ id: 'saved-2', timestamp: 0, explanationTimestamp: 15 }),
      ],
    });
  });

  it('initializes only the appended question when adding to an existing checkpoint', async () => {
    await renderMarker({ initialAddNewQuestion: true });
    expect(timeInput('Thời điểm xuất hiện').value).toBe('20');
    expect(timeInput('Thời gian giải thích').value).toBe('');
    expect(portalHost.querySelectorAll('[data-quiz-question-index]')).toHaveLength(3);
    await inputTime('Thời gian giải thích', '00');
    await selectQuestion(0);
    expect(timeInput('Thời gian giải thích').value).toBe('12');
    await selectQuestion(2);
    expect(timeInput('Thời gian giải thích').value).toBe('00');
  });

  it.each(['Thời điểm xuất hiện', 'Thời gian giải thích'])('rejects an out-of-duration %s without saving', async (label) => {
    await renderMarker();
    await inputTime(label, '02', 'Phút');
    await inputTime(label, '01');
    await clickButton('Lưu / Cập nhật câu hỏi');
    expect(sync).not.toHaveBeenCalled();
    expect(portalHost.textContent).toContain('không được vượt quá thời lượng video');
  });

  it('does not reset unsaved timing when management data refreshes', async () => {
    await renderMarker();
    await inputTime('Thời gian giải thích', '10');
    await renderMarker({ existingQuizzes: [{ ...question, explanationTimestamp: 19 }, secondQuestion] });
    expect(timeInput('Thời gian giải thích').value).toBe('10');
  });

  it('keeps both the editor and its nested delete confirmation inside the supplied portal container', async () => {
    await renderMarker();
    expect(portalHost.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
    expect(portalHost.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
    await clickButton('Xóa tất cả');
    expect(portalHost.querySelectorAll('[data-slot="dialog-content"]')).toHaveLength(2);
    expect(portalHost.textContent).toContain('Bạn có chắc chắn muốn xóa tất cả câu hỏi');
    await clickButton('Hủy bỏ');
    expect(deleteCluster).not.toHaveBeenCalled();
  });

  it('uses the same editable timing fields in the original Quiz edit dialog', async () => {
    await act(async () => root.render(createElement(DialogPortalContainerProvider, { container: portalHost },
      createElement(LessonQuizQuestionDialog, {
        lessonId: 'lesson', quiz: question, canEdit: true, duration: 120, onOpenChange: vi.fn(),
      }),
    )));
    expect(timeInput('Thời điểm xuất hiện').value).toBe('20');
    expect(timeInput('Thời gian giải thích').value).toBe('12');
    await inputTime('Thời điểm xuất hiện', '00');
    await inputTime('Thời gian giải thích', '15');
    await clickButton('Lưu thay đổi');
    expect(save).toHaveBeenCalledWith({
      quizId: question.id,
      payload: expect.objectContaining({ timestamp: 0, explanationTimestamp: 15, question: question.question }),
    });
  });
});
