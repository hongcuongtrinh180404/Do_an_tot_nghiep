/** Zero is a real checkpoint; missing timing must never be coerced to zero. */
export function isQuizTimestamp(value: unknown, duration?: number | null): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 &&
    (!(typeof duration === 'number' && Number.isFinite(duration) && duration > 0) || value <= duration);
}

export function hasQuizTimestamp<T extends { timestamp: number | null }>(
  quiz: T,
): quiz is T & { timestamp: number } {
  return isQuizTimestamp(quiz.timestamp);
}

/** Unscheduled questions first, then chronological checkpoints; ties stay deterministic. */
export function compareQuizTiming(
  a: { timestamp: number | null; order: number; id: string },
  b: { timestamp: number | null; order: number; id: string },
): number {
  return (a.timestamp ?? -1) - (b.timestamp ?? -1) || a.order - b.order || a.id.localeCompare(b.id);
}
