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
