// @vitest-environment jsdom

import { act, createElement, StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizQuestionTypeEnum, type ILessonCompletion, type ILessonQuiz, type IStudentLessonQuiz } from 'share-lib';
import { useLessonCheckpoints, type LessonCheckpoints } from '../components/player/use-lesson-checkpoints';
import { StudentInVideoQuizModal } from '../components/player/student-in-video-quiz-modal';
import type { UseVideoPlayerReturn } from '../components/player/use-video-player';
import {
  createInstructorQuizPreviews,
  gradeInstructorQuizPreview,
  instructorQuizPreviewRevision,
} from '../utils/instructor-quiz-preview';

const { managementQuery, completionQuery, publicPreviewQuery, submitAnswer, videoEnded, cacheCompletion, client } = vi.hoisted(() => ({
  managementQuery: vi.fn(),
  completionQuery: vi.fn(),
  publicPreviewQuery: vi.fn(),
  submitAnswer: vi.fn(),
  videoEnded: vi.fn(),
  cacheCompletion: vi.fn((_client, _userId, incoming) => incoming),
  client: { cancelQueries: vi.fn(), setQueryData: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => client }));
vi.mock('../api/lesson-quiz.api', () => ({ useLessonQuizzesQuery: managementQuery }));
vi.mock('../api/lesson-completion.api', () => ({
  useLessonCompletionQuery: completionQuery,
  useStudentQuizPreviewQuery: publicPreviewQuery,
  lessonCompletionApi: { submit: submitAnswer, videoEnded },
  cacheLessonCompletion: cacheCompletion,
  lessonCompletionKeys: { lesson: (...keys: string[]) => ['lesson-completion', ...keys] },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/components/ui/icon', () => ({
  Icon: () => createElement('span', { 'aria-hidden': true }),
}));

function question(id = 'q1', timestamp: number | null = 30): ILessonQuiz {
  return {
    id, lessonId: 'lesson', timestamp, order: 1, question: `Câu hỏi ${id}`,
    questionType: QuizQuestionTypeEnum.SINGLE,
    options: [
      { id: 'a', label: 'A', text: 'Đáp án A', isCorrect: true },
      { id: 'b', label: 'B', text: 'Đáp án B', isCorrect: false },
    ],
    explanation: `Giải thích ${id}`,
  };
}

function loaded<T>(data: T) {
  return { data, isSuccess: true, isError: false, isFetchedAfterMount: true, refetch: vi.fn() };
}

let root: Root;
let container: HTMLDivElement;
let video: HTMLVideoElement;
let paused: boolean;
let player: UseVideoPlayerReturn;
let latest: LessonCheckpoints;
let official: ILessonQuiz[];
let seekHandler: ((seconds: number) => void) | null;

function Probe({ instructorPreview = true, enrolled = false, enabled = true, eligibilityReady = true }) {
  const checkpoints = useLessonCheckpoints({
    userId: 'instructor', courseId: 'course', lessonId: 'lesson', player,
    enabled, enrolled, eligibilityReady, instructorPreview,
  });
  useEffect(() => { latest = checkpoints; }, [checkpoints]);
  const active = checkpoints.active;
  return active ? createElement(StudentInVideoQuizModal, {
    key: `${active.timestamp}:${active.quizzes[0]?.id}:${active.quizzes[0]?.revision}`,
    timestamp: active.timestamp,
    formatTime: player.formatTime,
    quizzes: active.quizzes,
    required: active.required,
    canSubmit: checkpoints.canSubmit,
    isInstructorPreview: checkpoints.isInstructorPreview,
    submitting: checkpoints.submitting,
    error: checkpoints.error,
    onSubmit: checkpoints.submit,
    onClose: checkpoints.close,
  }) : null;
}

function renderProbe(props: Parameters<typeof Probe>[0] = {}) {
  act(() => root.render(createElement(StrictMode, null, createElement(Probe, props))));
}

function advance(seconds: number) {
  act(() => {
    paused = false;
    video.currentTime = seconds;
    video.dispatchEvent(new Event('timeupdate'));
  });
}

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find((item) => item.textContent?.trim() === label);
  expect(found, `Missing button: ${label}`).toBeDefined();
  return found!;
}

function expectNoProgressWrites() {
  expect(submitAnswer).not.toHaveBeenCalled();
  expect(videoEnded).not.toHaveBeenCalled();
  expect(cacheCompletion).not.toHaveBeenCalled();
  expect(client.cancelQueries).not.toHaveBeenCalled();
  expect(client.setQueryData).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  official = [
    question(),
    {
      ...question('q2', 31), order: 2, questionType: QuizQuestionTypeEnum.MULTIPLE,
      options: [...question().options, { id: 'c', label: 'C', text: 'Đáp án C', isCorrect: true }],
    },
  ];
  managementQuery.mockImplementation(() => loaded(official));
  completionQuery.mockReturnValue(loaded(undefined));
  publicPreviewQuery.mockReturnValue(loaded([]));
  paused = true;
  seekHandler = null;
  video = document.createElement('video');
  Object.defineProperties(video, {
    currentTime: { writable: true, value: 0 },
    duration: { value: 120 },
    paused: { get: () => paused },
  });
  vi.spyOn(video, 'pause').mockImplementation(() => { paused = true; });
  vi.spyOn(video, 'play').mockImplementation(async () => {
    paused = false;
    video.dispatchEvent(new Event('play'));
  });
  player = {
    videoRef: { current: video }, containerRef: { current: null },
    isPlaying: false, currentTime: 0, duration: 120, volume: 1, isMuted: false,
    playbackRate: 1, isFullscreen: false, bufferedEnd: 120,
    setSeekHandler: (handler) => { seekHandler = handler; },
    seek: (seconds) => { seekHandler?.(seconds); },
    formatTime: (seconds) => `00:${String(seconds).padStart(2, '0')}`,
    togglePlay: vi.fn(), seekRelative: vi.fn(), setVolumeLevel: vi.fn(),
    toggleMute: vi.fn(), setRate: vi.fn(), toggleFullscreen: vi.fn(),
  };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Instructor in-video quiz preview', () => {
  it('opens a playable, optional question cluster when natural playback crosses its timestamp', () => {
    renderProbe();
    expect(managementQuery).toHaveBeenLastCalledWith('lesson', true);
    expect(completionQuery).toHaveBeenLastCalledWith('instructor', 'course', 'lesson', false);
    expect(publicPreviewQuery).toHaveBeenLastCalledWith('lesson', false);
    advance(30.4);
    expect(video.currentTime).toBe(30);
    expect(paused).toBe(true);
    expect(latest.active?.required).toBe(false);
    expect(latest.active?.quizzes).toHaveLength(2);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Làm thử câu hỏi');
    expect(container.textContent).toContain('Kết quả làm thử không được lưu');
    expect(container.textContent).not.toContain('Đăng ký khóa học');
    expect(button('A.Đáp án A').disabled).toBe(false);
    expectNoProgressWrites();
  });

  it('grades single and multiple answers locally, shows feedback, and resumes after the whole cluster', async () => {
    renderProbe({ enrolled: true });
    advance(30.4);
    expect(latest.enforced).toBe(false);
    act(() => button('B.Đáp án B').click());
    await act(async () => button('Trả lời').click());
    expect(container.textContent).toContain('Đáp án đúng được đánh dấu');
    expect(container.textContent).toContain('Giải thích q1');
    expect(latest.quizzes[0].answer?.isCorrect).toBe(false);
    expect(latest.completion).toBeUndefined();

    act(() => button('Câu tiếp theo').click());
    expect(container.textContent).toContain('Câu hỏi q2');
    act(() => {
      button('A.Đáp án A').click();
      button('C.Đáp án C').click();
    });
    await act(async () => button('Trả lời').click());
    expect(container.textContent).toContain('Bạn đã trả lời đúng.');
    expect(latest.quizzes[1].answer?.isCorrect).toBe(true);
    act(() => button('Xem tiếp video').click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(paused).toBe(false);
    act(() => video.dispatchEvent(new Event('ended')));
    expectNoProgressWrites();
  });

  it('allows skipping, backward replay and forward seeking without locking the editor', () => {
    renderProbe();
    advance(30.4);
    act(() => button('Bỏ qua').click());
    expect(paused).toBe(false);
    act(() => player.seek(90));
    expect(video.currentTime).toBe(90);
    expect(latest.active).toBeNull();
    act(() => player.seek(20));
    advance(30.5);
    expect(container.textContent).toContain('Làm thử câu hỏi');
    expectNoProgressWrites();
  });

  it.each([0, 120])('opens an instructor checkpoint at %s seconds', (timestamp) => {
    official = [question('edge', timestamp)];
    renderProbe();
    if (timestamp === 0) advance(0.1);
    else act(() => {
      video.currentTime = 120;
      video.dispatchEvent(new Event('ended'));
    });
    expect(latest.active?.timestamp).toBe(timestamp);
    expect(container.textContent).toContain('Câu hỏi edge');
    expectNoProgressWrites();
  });

  it('discards a local answer when the instructor edits the question or answer key', async () => {
    official = [question()];
    renderProbe();
    advance(30.4);
    await act(async () => latest.submit(latest.quizzes[0], ['a']));
    expect(latest.quizzes[0].answer?.isCorrect).toBe(true);
    const previous = latest.quizzes[0];
    official = [{ ...official[0], question: 'Nội dung mới' }];
    renderProbe();
    expect(latest.quizzes[0].answer).toBeNull();
    expect(container.textContent).toContain('Nội dung mới');
    expect(container.textContent).not.toContain('Giải thích q1');
    await act(async () => latest.submit(previous, ['a']));
    expect(latest.error).toContain('Câu hỏi đã được cập nhật');
    expectNoProgressWrites();
  });

  it('waits for the management query and exposes its retry on error', async () => {
    const retry = vi.fn();
    managementQuery.mockReturnValue({ data: undefined, isSuccess: false, isError: true, refetch: retry });
    renderProbe();
    advance(30.4);
    expect(latest.active).toBeNull();
    expect(latest.ready).toBe(false);
    expect(latest.isError).toBe(true);
    await latest.retry();
    expect(retry).toHaveBeenCalledOnce();
    expectNoProgressWrites();
  });

  it('does not attach a checkpoint controller or enable submission when disabled', () => {
    renderProbe({ enabled: false });
    advance(30.4);
    expect(managementQuery).toHaveBeenLastCalledWith('lesson', false);
    expect(seekHandler).toBeNull();
    expect(latest.active).toBeNull();
    expect(latest.canSubmit).toBe(false);
    expectNoProgressWrites();
  });

  it('keeps learner questions and server-side submission separate from management data', async () => {
    const quiz: IStudentLessonQuiz = { ...createInstructorQuizPreviews([question()], new Map())[0], revision: 'server-revision' };
    const completion = { quizzes: [quiz], videoEnded: false } as ILessonCompletion;
    completionQuery.mockReturnValue(loaded(completion));
    submitAnswer.mockResolvedValue({ ...completion, quizzes: [{ ...quiz, answer: gradeInstructorQuizPreview(question(), ['a']) }] });
    renderProbe({ instructorPreview: false, enrolled: true });
    advance(30.4);
    expect(managementQuery).toHaveBeenLastCalledWith('lesson', false);
    expect(latest.enforced).toBe(true);
    expect(latest.active?.required).toBe(true);
    expect(container.textContent).toContain('Câu hỏi bắt buộc');
    expect(container.textContent).not.toContain('Làm thử');
    await act(async () => latest.submit(quiz, ['a']));
    expect(submitAnswer).toHaveBeenCalledWith('course', 'lesson', {
      quizId: 'q1', quizRevision: 'server-revision', selectedOptionIds: ['a'],
    });
    expect(cacheCompletion).toHaveBeenCalledOnce();
  });

  it('keeps unenrolled learner previews read-only without using the management answer key', () => {
    publicPreviewQuery.mockReturnValue(loaded(createInstructorQuizPreviews([question()], new Map())));
    renderProbe({ instructorPreview: false });
    advance(30.4);
    expect(managementQuery).toHaveBeenLastCalledWith('lesson', false);
    expect(publicPreviewQuery).toHaveBeenLastCalledWith('lesson', true);
    expect(latest.canSubmit).toBe(false);
    expect(button('A.Đáp án A').disabled).toBe(true);
    expect(container.textContent).toContain('Đăng ký khóa học');
    expectNoProgressWrites();
  });
});

describe('Instructor preview grading', () => {
  it('includes valid zero/end timestamps but never unscheduled or out-of-duration questions', () => {
    const quizzes = [question('zero', 0), question('end', 120), question('missing', null), question('late', 121)];
    expect(createInstructorQuizPreviews(quizzes, new Map(), 120).map((quiz) => quiz.id)).toEqual(['zero', 'end']);
  });

  it('hides the answer key and explanation until a local trial answer has been submitted', () => {
    const quiz = question();
    const before = createInstructorQuizPreviews([quiz], new Map())[0];
    expect(before.options[0]).not.toHaveProperty('isCorrect');
    expect(before.answer).toBeNull();
    expect(before.explanation).toBeNull();
    const answer = gradeInstructorQuizPreview(quiz, ['a']);
    const after = createInstructorQuizPreviews([quiz], new Map([[quiz.id, answer]]))[0];
    expect(after.answer?.isCorrect).toBe(true);
    expect(after.explanation).toBe(quiz.explanation);
  });

  it('requires all and only correct answers for a multiple-answer question', () => {
    const quiz = official[1];
    expect(gradeInstructorQuizPreview(quiz, ['a']).isCorrect).toBe(false);
    expect(gradeInstructorQuizPreview(quiz, ['a', 'b', 'c']).isCorrect).toBe(false);
    expect(gradeInstructorQuizPreview(quiz, ['c', 'a']).isCorrect).toBe(true);
  });

  it.each([[], ['missing'], ['a', 'a'], ['a', 'b']].map((selection) => ({ selection })))('rejects invalid selections $selection', ({ selection }) => {
    expect(() => gradeInstructorQuizPreview(question(), selection)).toThrow('Phương án trả lời không hợp lệ');
  });

  it('does not invalidate an answer for timing changes, but does for content or answer-key changes', () => {
    const quiz = question();
    const revision = instructorQuizPreviewRevision(quiz);
    expect(instructorQuizPreviewRevision({ ...quiz, timestamp: 60, order: 2 })).toBe(revision);
    expect(instructorQuizPreviewRevision({ ...quiz, question: 'Câu hỏi mới' })).not.toBe(revision);
    expect(instructorQuizPreviewRevision({ ...quiz, options: quiz.options.map((option) => ({ ...option, isCorrect: !option.isCorrect })) })).not.toBe(revision);
  });
});
