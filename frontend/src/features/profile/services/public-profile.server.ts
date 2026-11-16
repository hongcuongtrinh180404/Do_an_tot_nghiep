import { cache } from 'react';
import type { IApiResponse, IPublicUserProfile } from 'share-lib';
import { API_BASE_URL } from '@/lib/api-client';

/** No cookies or bearer tokens: this must work for an anonymous visitor. */
export const getPublicProfile = cache(async (username: string): Promise<IPublicUserProfile | null> => {
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,28}[a-z0-9])?$/i.test(username)) return null;

  const response = await fetch(`${API_BASE_URL}/users/public/${encodeURIComponent(username)}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Không thể tải hồ sơ công khai');
  const result: IApiResponse<IPublicUserProfile> = await response.json();
  return result.data;
});
