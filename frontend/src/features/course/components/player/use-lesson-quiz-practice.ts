'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { IStudentLessonQuiz } from 'share-lib';

interface QuizAttempt {
  selectedOptionIds: string[];
  checked: boolean;
}

type QuizAttempts = Record<string, QuizAttempt>;
const CHANGE_EVENT = 'mindly:quiz-practice';
const memoryFallback = new Map<string, string>();
const serverSnapshot = () => null;
const subscribeHydration = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export const quizPracticeKey = (userId: string | undefined, courseId: string, lessonId: string) =>
  `mindly:quiz-practice:v1:${JSON.stringify([userId ?? 'guest', courseId, lessonId])}`;
const questionKey = (quiz: IStudentLessonQuiz) => JSON.stringify([quiz.id, quiz.revision]);

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null) memoryFallback.clear();
    else memoryFallback.delete(event.key);
    listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

function read(key: string): string | null {
  if (memoryFallback.has(key)) return memoryFallback.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse(raw: string | null): QuizAttempts {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, attempt]) =>
      attempt && typeof attempt === 'object' && typeof attempt.checked === 'boolean' &&
      Array.isArray(attempt.selectedOptionIds) && attempt.selectedOptionIds.every((id: unknown) => typeof id === 'string')));
  } catch {
    return {};
  }
}

function attemptFor(quiz: IStudentLessonQuiz, attempts: QuizAttempts): QuizAttempt {
  const attempt = attempts[questionKey(quiz)] ?? {
    selectedOptionIds: quiz.answer?.selectedOptionIds ?? [],
    checked: Boolean(quiz.answer),
  };
  const selectedOptionIds = [...new Set(attempt.selectedOptionIds)]
    .filter((id) => quiz.options.some((option) => option.id === id));
  const valid = quiz.questionType === 'multiple' || selectedOptionIds.length <= 1;
  return {
    selectedOptionIds: valid ? selectedOptionIds : [],
    checked: valid && selectedOptionIds.length > 0 && attempt.checked && quiz.answer?.quizRevision === quiz.revision,
  };
}

/** Practice is browser-local; only server answers may grant completion or reveal the key. */
export function useLessonQuizPractice(userId: string | undefined, courseId: string, lessonId: string, quizzes: IStudentLessonQuiz[]) {
  const key = quizPracticeKey(userId, courseId, lessonId);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const attempts = useMemo(() => parse(raw), [raw]);

  const write = useCallback((next: QuizAttempts) => {
    const snapshot = JSON.stringify(next);
    try {
      window.localStorage.setItem(key, snapshot);
      memoryFallback.delete(key);
    } catch {
      // Keep the current session usable if storage is blocked or full.
      memoryFallback.set(key, snapshot);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [key]);

  const saveAttempt = (quiz: IStudentLessonQuiz, update: QuizAttempt | ((previous: QuizAttempt) => QuizAttempt)) => {
    const current = parse(read(key));
    const validKeys = new Set(quizzes.map(questionKey));
    const attempt = typeof update === 'function' ? update(attemptFor(quiz, current)) : update;
    write({ ...Object.fromEntries(Object.entries(current).filter(([id]) => validKeys.has(id))), [questionKey(quiz)]: attempt });
  };

  return {
    hydrated,
    getAttempt: (quiz: IStudentLessonQuiz) => attemptFor(quiz, attempts),
    saveAttempt,
    reset: () => write(Object.fromEntries(quizzes.map((quiz) => [questionKey(quiz), { selectedOptionIds: [], checked: false }]))),
  };
}
