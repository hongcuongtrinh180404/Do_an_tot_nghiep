'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useUserProfileQuery } from '../api/profile.api';
import { ProfileInfoCard } from './profile-info-card';
import { AccountSettingsContent } from './account-settings-content';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useIsMounted } from '@/hooks/use-is-mounted';

export function SettingsPageContent(): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: authUser, isLoading: isAuthLoading } = useCurrentUserQuery();
  const { data: profileUser, isLoading: isProfileLoading } = useUserProfileQuery();

  // Combine auth user and profile user
  const user = profileUser || authUser;
  const isLoading = !isMounted || isAuthLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
        <div className="size-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">
          Đang tải thông tin cài đặt tài khoản...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4 text-foreground">
          <Icon icon="lucide:user-x" className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">
          Yêu cầu đăng nhập
        </h2>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Vui lòng đăng nhập vào tài khoản để truy cập và quản lý cài đặt tài khoản trên Mindly.
        </p>
        <Link
          href="/login"
          className={buttonVariants({
            size: 'sm',
            className: 'bg-foreground text-background hover:bg-foreground/90 h-9 px-4 text-xs',
          })}
        >
          <Icon icon="lucide:log-in" className="size-3.5 mr-2" />
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cài đặt tài khoản</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cài Đặt Tài Khoản
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Quản lý bảo mật tài khoản, thông tin địa chỉ email và mật khẩu đăng nhập.
          </p>
        </div>

        <Link
          href="/profile"
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'h-9 px-3.5 text-xs font-medium shrink-0',
          })}
        >
          <Icon icon="lucide:user" className="size-3.5 mr-1.5 text-muted-foreground" />
          Hồ sơ cá nhân
        </Link>
      </div>

      {/* Main Grid: Left (Identity Summary) + Right (Account Settings & Security) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Identity Summary Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <ProfileInfoCard user={user} />
        </div>

        {/* Right Column: Account Settings Content */}
        <div className="lg:col-span-8 space-y-6">
          <AccountSettingsContent user={user} />
        </div>
      </div>
    </div>
  );
}

