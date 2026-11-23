import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleEnum, UserStatusEnum, type IPublicUserProfile, type IUserProfile } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useUserProfileQuery } from '../api/profile.api';
import { ProfilePageView } from '../components/profile-page-view';
import { ProfileInfoCard } from '../components/profile-info-card';

vi.mock('@/features/auth/api/auth.api', () => ({ useCurrentUserQuery: vi.fn() }));
vi.mock('../api/profile.api', () => ({ useUserProfileQuery: vi.fn() }));
vi.mock('@/hooks/use-is-mounted', () => ({ useIsMounted: () => true }));
vi.mock('../components/avatar-uploader', () => ({ AvatarUploader: () => null }));
vi.mock('../components/profile-form', () => ({ ProfileForm: () => null }));
vi.mock('../components/profile-course-tabs', () => ({ ProfileCourseTabs: () => null }));

const profile: IPublicUserProfile = {
  fullName: 'Trịnh Hồng Cường',
  username: 'hongcuongtam',
  avatarUrl: null,
  bio: null,
  role: RoleEnum.INSTRUCTOR,
  createdAt: '2026-10-01T00:00:00.000Z',
  socialLinks: { facebook: 'https://www.facebook.com/trinhhongcuong1804/' },
};

const user: IUserProfile = {
  ...profile,
  id: 'profile-owner',
  email: 'owner@example.test',
  status: UserStatusEnum.ACTIVE,
};

beforeEach(() => {
  vi.mocked(useCurrentUserQuery).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUserQuery>);
  vi.mocked(useUserProfileQuery).mockReturnValue({ data: user } as ReturnType<typeof useUserProfileQuery>);
  vi.stubGlobal('localStorage', { getItem: () => 'profile-test-token' });
});

afterEach(() => vi.unstubAllGlobals());

describe('profile link visibility', () => {
  it('hides the profile URL and copy-link button from the owner profile', () => {
    const html = renderToStaticMarkup(<ProfilePageView profile={profile} />);

    expect(html).not.toContain('Liên kết hồ sơ:');
    expect(html).not.toContain('Sao chép liên kết');
    expect(html).toContain('@hongcuongtam');
    expect(html).toContain('href="/profile/hongcuongtam"');
    expect(html).toContain('href="https://www.facebook.com/trinhhongcuong1804/"');
    expect(html).toContain('Sao chép ID');
  });

  it('also hides the copy-link button in the read-only profile', () => {
    vi.mocked(useCurrentUserQuery).mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUserQuery>);
    vi.mocked(useUserProfileQuery).mockReturnValue({ data: undefined } as ReturnType<typeof useUserProfileQuery>);
    vi.stubGlobal('localStorage', { getItem: () => null });

    const html = renderToStaticMarkup(<ProfilePageView profile={profile} />);

    expect(html).not.toContain('Liên kết hồ sơ:');
    expect(html).not.toContain('Sao chép liên kết');
    expect(html).toContain('@hongcuongtam');
    expect(html).toContain('href="https://www.facebook.com/trinhhongcuong1804/"');
    expect(html).toContain('Giới thiệu');
  });

  it('does not render the copy-link button on the shared info card', () => {
    const html = renderToStaticMarkup(<ProfileInfoCard user={user} />);

    expect(html).not.toContain('Sao chép liên kết');
    expect(html).toContain('Sao chép ID');
    expect(html).toContain('@hongcuongtam');
    expect(html).toContain('href="https://www.facebook.com/trinhhongcuong1804/"');
  });
});
