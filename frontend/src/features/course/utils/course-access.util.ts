import { RoleEnum, type ICourse, type IUserProfile } from 'share-lib';

/** Management controls require both an identified user and an authorized course response. */
export function canManageCourse(
  user: Pick<IUserProfile, 'id' | 'role'> | null | undefined,
  course: Pick<ICourse, 'instructorId'> | null | undefined,
): boolean {
  if (!user || !course) return false;

  return user.role === RoleEnum.ADMIN || (
    user.role === RoleEnum.INSTRUCTOR && course.instructorId === user.id
  );
}
