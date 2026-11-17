'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useUserProfileQuery } from '../api/profile.api';
import { getPublicProfilePath } from '../utils/profile-url';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { Button, buttonVariants } from '@/components/ui/button';

/** Legacy /profile is only an entry point into the current account's canonical URL. */
export function ProfilePageContent(): React.JSX.Element {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { data: viewer, isLoading: authLoading } = useCurrentUserQuery();
  const { data: profile, isLoading, isError, refetch } = useUserProfileQuery();
  const signedIn = isMounted && Boolean(localStorage.getItem('accessToken'));

  useEffect(() => {
    if (signedIn && profile?.username && profile.id === viewer?.id) {
      router.replace(getPublicProfilePath(profile.username));
    }
  }, [signedIn, profile, viewer?.id, router]);

  if (!isMounted || authLoading || isLoading || (signedIn && profile?.username)) {
    return <div role="status" className="mx-auto max-w-xl px-6 py-16 text-sm text-muted-foreground">Đang mở hồ sơ cá nhân…</div>;
  }
  if (signedIn && isError) {
    return (
      <div role="alert" className="mx-auto max-w-xl space-y-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Không thể tải hồ sơ</h1>
        <Button variant="outline" onClick={() => void refetch()}>Thử lại</Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl space-y-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Yêu cầu đăng nhập</h1>
      <p className="text-sm text-muted-foreground">Vui lòng đăng nhập để mở hồ sơ cá nhân của bạn.</p>
      <Link href="/login?redirect=/profile" className={buttonVariants()}>Đăng nhập</Link>
    </div>
  );
}
