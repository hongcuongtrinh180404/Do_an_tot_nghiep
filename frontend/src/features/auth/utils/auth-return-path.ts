import { RoleEnum, type IUserProfile } from 'share-lib';

/**
 * Only the instructor entry currently participates in the return-to flow.
 * Keep the destination explicit rather than passing arbitrary URLs to router.
 */
export function getAuthReturnPath(value: string | null | undefined): string | null {
  return value === '/become-instructor' || value === '/become-instructor#registration'
    ? value
    : null;
}

export function authPathWithReturn(path: '/login' | '/register', next?: string | null): string {
  const safeNext = getAuthReturnPath(next);
  return safeNext ? `${path}?next=${encodeURIComponent(safeNext)}` : path;
}

/**
 * Single landing rule for every sign-in method (password or Google):
 * admins always enter the admin console, everyone else lands on the homepage
 * unless they came from the instructor registration entry.
 */
export function getPostLoginRedirectPath(
  user: Pick<IUserProfile, 'role'>,
  returnTo?: string | null,
): string {
  if (user.role === RoleEnum.ADMIN) {
    return '/admin';
  }

  return getAuthReturnPath(returnTo) ?? '/';
}
