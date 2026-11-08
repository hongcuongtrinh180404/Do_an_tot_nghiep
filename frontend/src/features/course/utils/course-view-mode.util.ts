export type CourseViewMode = 'learn' | 'edit';

/** Viewing is read-only unless editing was explicitly requested. */
export function parseCourseViewMode(value: unknown): CourseViewMode {
  return value === 'edit' ? 'edit' : 'learn';
}

export function getCourseUrl(courseId: string, mode: CourseViewMode = 'learn'): string {
  return `/courses/${courseId}${mode === 'edit' ? '?mode=edit' : ''}`;
}

export function getLessonUrl(
  courseId: string,
  lessonId: string,
  mode: CourseViewMode = 'learn',
): string {
  return `/courses/${courseId}/lessons/${lessonId}${mode === 'edit' ? '?mode=edit' : ''}`;
}
