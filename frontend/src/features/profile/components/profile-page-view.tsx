'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RoleEnum, type IPublicUserProfile } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useUserProfileQuery } from '../api/profile.api';
import { CopyProfileLinkButton } from './copy-profile-link-button';
import { ProfileSocialButtons } from './profile-social-buttons';
import { ProfileForm } from './profile-form';
import { ProfileInfoCard } from './profile-info-card';
import { ProfileCourseTabs } from './profile-course-tabs';
import { getPublicProfilePath } from '../utils/profile-url';

const roleLabels = {
  [RoleEnum.ADMIN]: 'Quản trị viên', [RoleEnum.INSTRUCTOR]: 'Giảng viên', [RoleEnum.STUDENT]: 'Học viên',
};

export function ProfilePageView({ profile }: { profile: IPublicUserProfile }): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: viewer } = useCurrentUserQuery();
  const signedIn = isMounted && Boolean(localStorage.getItem('accessToken'));
  const matchesHandle = signedIn && viewer?.username === profile.username;
  const { data: ownProfile, isError, refetch } = useUserProfileQuery(matchesHandle);
  const owner = matchesHandle && ownProfile?.id === viewer?.id && ownProfile?.username === profile.username;

  return (
    <div data-testid="public-profile" className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 text-foreground sm:space-y-10 sm:px-6 sm:py-12 lg:px-8">
      {owner && ownProfile ? (
        <section aria-labelledby="profile-name" className="space-y-6">
          <div className="space-y-2">
            <h1 id="profile-name" className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{ownProfile.fullName}</h1>
            <p className="text-sm text-muted-foreground">Quản lý hồ sơ cá nhân của bạn.</p>
            <p className="break-all text-sm">
              Liên kết hồ sơ:{' '}
              <Link href={getPublicProfilePath(profile.username)} className="underline underline-offset-4">{getPublicProfilePath(profile.username)}</Link>
            </p>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <ProfileInfoCard user={ownProfile} />
            <div className="lg:col-span-2"><ProfileForm user={ownProfile} /></div>
          </div>
        </section>
      ) : (
        <>
          <ReadOnlyProfile profile={profile} />
          {matchesHandle && (
            <div role={isError ? 'alert' : 'status'} className="text-sm text-muted-foreground">
              {isError ? (
                <>Không thể tải phần chỉnh sửa hồ sơ. <button type="button" onClick={() => void refetch()} className="min-h-11 underline">Thử lại</button></>
              ) : 'Đang tải phần chỉnh sửa hồ sơ…'}
            </div>
          )}
        </>
      )}
      <ProfileCourseTabs key={`${profile.username}:${profile.role}`} username={profile.username} isInstructor={profile.role === RoleEnum.INSTRUCTOR} />
    </div>
  );
}

function ReadOnlyProfile({ profile }: { profile: IPublicUserProfile }): React.JSX.Element {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const memberSince = new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
  return (
    <section aria-labelledby="profile-name" className="space-y-6 rounded-xl bg-muted/40 p-5 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted sm:size-24">
            {profile.avatarUrl && profile.avatarUrl !== failedAvatar ? (
              <Image src={profile.avatarUrl} alt={`Ảnh đại diện của ${profile.fullName}`} fill sizes="96px" className="object-cover" onError={() => setFailedAvatar(profile.avatarUrl)} />
            ) : <span className="text-3xl font-semibold" aria-hidden="true">{profile.fullName.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0 space-y-2">
            <h1 id="profile-name" className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{profile.fullName}</h1>
            <p className="break-all text-sm text-muted-foreground">@{profile.username}</p>
            <p className="text-sm">{roleLabels[profile.role]}</p>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
          <CopyProfileLinkButton username={profile.username} />
          <ProfileSocialButtons socialLinks={profile.socialLinks} />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Giới thiệu</h2>
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{profile.bio || 'Người dùng chưa cập nhật phần giới thiệu.'}</p>
        <p className="text-sm text-muted-foreground">Tham gia từ {memberSince}</p>
      </div>
    </section>
  );
}
