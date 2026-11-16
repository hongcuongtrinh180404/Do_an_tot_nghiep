'use client';

import { useSyncExternalStore } from 'react';

const eventName = 'quiz-timing-validation';
const checked = new Set<string>();
const key = (courseId: string) => `quiz-timing-validation:${courseId}`;

export function markQuizTimingValidation(courseId: string): void {
  checked.add(courseId);
  try { sessionStorage.setItem(key(courseId), '1'); } catch { /* In-memory state supports restricted storage. */ }
  window.dispatchEvent(new Event(eventName));
}

function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useQuizTimingValidation(courseId?: string): boolean {
  return useSyncExternalStore(subscribe, () => {
    if (!courseId) return false;
    try { return checked.has(courseId) || sessionStorage.getItem(key(courseId)) === '1'; }
    catch { return checked.has(courseId); }
  }, () => false);
}
