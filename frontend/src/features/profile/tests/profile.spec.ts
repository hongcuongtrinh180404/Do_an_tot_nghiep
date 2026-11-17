import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { updateProfileSchema } from '../schemas/profile.schema';
import { updateUserAdminSchema } from '@/features/admin/users/schemas/user-admin.schema';
import { getPublicProfilePath } from '../utils/profile-url';
import { getPublicProfile } from '../services/public-profile.server';
import { formatSocialUrl } from '../components/profile-social-buttons';

afterEach(() => vi.unstubAllGlobals());

describe('server-owned profile handle', () => {
  it('does not include username in the editable profile data', () => {
    const data = updateProfileSchema.parse({ fullName: 'Nguyễn Văn A', username: 'manual' });
    expect(data).not.toHaveProperty('username');
  });

  it('does not include username in editable admin data', () => {
    const data = updateUserAdminSchema.parse({
      fullName: 'Nguyễn Văn A', username: 'manual',
      role: RoleEnum.STUDENT, status: UserStatusEnum.ACTIVE,
    });
    expect(data).not.toHaveProperty('username');
  });

  it('creates encoded public profile paths', () => {
    expect(getPublicProfilePath('nguyen.van.a')).toBe('/profile/nguyen.van.a');
    expect(getPublicProfilePath('a/b')).toBe('/profile/a%2Fb');
  });

  it('fetches public information without authentication or caching private data', async () => {
    const data = { username: 'nguyen.van.a', fullName: 'Nguyễn Văn A' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPublicProfile('nguyen.van.a')).toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/public/nguyen.van.a'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('headers');
  });

  it('distinguishes a missing profile from a server error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPublicProfile('missing')).toBeNull();
    await expect(getPublicProfile('unavailable')).rejects.toThrow('Không thể tải hồ sơ');
  });

  it.each(['', '.', '$where', '~migration', 'a/b', 'a'.repeat(31)])('does not fetch malformed handle %s', async (username) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPublicProfile(username)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('socialLinks schema and formatting', () => {
    it('parses and trims social links', () => {
      const data = updateProfileSchema.parse({
        fullName: 'Trịnh Hồng Cường',
        socialLinks: {
          facebook: '  facebook.com/hongcuongtam  ',
          linkedin: ' linkedin.com/in/hongcuongtam ',
          youtube: '',
          github: '   ',
        },
      });

      expect(data.socialLinks?.facebook).toBe('facebook.com/hongcuongtam');
      expect(data.socialLinks?.linkedin).toBe('linkedin.com/in/hongcuongtam');
      expect(data.socialLinks?.youtube).toBe('');
      expect(data.socialLinks?.github).toBe('');
    });

    it('formats social links into valid external URLs', () => {
      expect(formatSocialUrl('facebook', 'facebook.com/hongcuongtam')).toBe('https://facebook.com/hongcuongtam');
      expect(formatSocialUrl('facebook', 'https://facebook.com/hongcuongtam')).toBe('https://facebook.com/hongcuongtam');
      expect(formatSocialUrl('linkedin', 'linkedin.com/in/hongcuongtam')).toBe('https://linkedin.com/in/hongcuongtam');
      expect(formatSocialUrl('youtube', 'youtube.com/@hongcuongtam')).toBe('https://youtube.com/@hongcuongtam');
      expect(formatSocialUrl('github', 'github.com/hongcuongtam')).toBe('https://github.com/hongcuongtam');
      expect(formatSocialUrl('github', 'cuongdev')).toBe('https://github.com/cuongdev');
      expect(formatSocialUrl('facebook', '')).toBeNull();
      expect(formatSocialUrl('facebook', '   ')).toBeNull();
      expect(formatSocialUrl('facebook', null)).toBeNull();
    });
  });
});
