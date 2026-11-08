import { CourseStatusEnum, RoleEnum, type ICourse, type IUserProfile } from 'share-lib';
import type { CourseViewMode } from './course-view-mode.util';

type FlexibleUser =
  | Pick<IUserProfile, 'id' | 'role'>
  | { id?: string; _id?: string; role?: RoleEnum }
  | null
  | undefined;

type FlexibleCourse =
  | (Pick<ICourse, 'instructorId'> & {
    instructor?: { id?: string; _id?: string } | null;
    status?: CourseStatusEnum;
  })
  | {
    instructorId?: string | { id?: string; _id?: string };
    instructor?: { id?: string; _id?: string } | null;
    status?: CourseStatusEnum;
  }
  | null
  | undefined;

/**
 * Validates whether the current user is authorized to manage or edit a course.
 * - ADMIN: Always authorized.
 * - INSTRUCTOR: Authorized only if they are the course owner.
 * - Normal users / students / unauthenticated: Not authorized (Read-only).
 */
export function canManageCourse(
  user: FlexibleUser,
  course: FlexibleCourse,
): boolean {
  if (!user || !course) return false;

  if (user.role === RoleEnum.ADMIN) {
    return true;
  }

  if (user.role !== RoleEnum.INSTRUCTOR) {
    return false;
  }

  const userId = user.id || (user as { _id?: string })._id;
  const rawInstructorId = course.instructorId as unknown;

  let instructorId: string | undefined;
  if (typeof rawInstructorId === 'string') {
    instructorId = rawInstructorId;
  } else if (rawInstructorId && typeof rawInstructorId === 'object') {
    instructorId =
      (rawInstructorId as { id?: string; _id?: string }).id ||
      (rawInstructorId as { id?: string; _id?: string })._id;
  }

  if (!instructorId && course.instructor) {
    instructorId = course.instructor.id || (course.instructor as { _id?: string })._id;
  }

  if (!userId || !instructorId) {
    return false;
  }

  return String(instructorId) === String(userId);
}

/** Account ownership alone must never enable editing in the learner experience. */
export function canEditCourseContent(
  user: FlexibleUser,
  course: FlexibleCourse,
  mode: CourseViewMode = 'learn',
): boolean {
  return mode === 'edit' &&
    Boolean(course?.status) &&
    course?.status !== CourseStatusEnum.PENDING_APPROVAL &&
    canManageCourse(user, course);
}
