export function getPublicProfilePath(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}
