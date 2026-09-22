'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useUserProfileQuery } from '../api/profile.api';
import { AvatarUploader } from './avatar-uploader';
import { ProfileForm } from './profile-form';
import { ProfileInfoCard } from './profile-info-card';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { useIsMounted } from '@/hooks/use-is-mounted';

export function ProfilePageContent(): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: authUser, isLoading: isAuthLoading } = useCurrentUserQuery();
  const { data: profileUser, isLoading: isProfileLoading } = useUserProfileQuery();

  // Combine auth user and profile user
  const user = profileUser || authUser;
  const isLoading = !isMounted || isAuthLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium">
          Đang tải dữ liệu hồ sơ cá nhân...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="size-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Icon icon="lucide:user-x" className="size-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Chưa Đăng Nhập</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Vui lòng đăng nhập vào tài khoản để xem và cập nhật thông tin hồ sơ của bạn.
        </p>
        <Link href="/login" className={buttonVariants({ size: 'default' })}>
          <Icon icon="lucide:log-in" className="size-4 mr-2" />
          Đến trang Đăng Nhập
        </Link>
      </div>
    );
  }

  const fullName =
    user.firstName && user.lastName
      ? `${user.lastName} ${user.firstName}`
      : user.firstName || user.lastName || user.email.split('@')[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Icon icon="lucide:home" className="size-3.5" />
              Trang Chủ
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Hồ Sơ Cá Nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Quản Lý Hồ Sơ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý thông tin tài khoản cá nhân, cập nhật ảnh đại diện lưu trữ Cloudinary
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Icon icon="lucide:arrow-left" className="size-3.5 mr-1.5" />
            Về Trang Chủ
          </Link>
        </div>
      </div>

      {/* Main Grid: Left (Avatar & Identity) + Right (Form & Cloudinary info) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Avatar & Overview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Avatar Management Card */}
          <Card className="border-border/50 bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon icon="lucide:image" className="size-4 text-primary" />
                Ảnh Đại Diện (Cloudinary)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <AvatarUploader
                currentAvatar={user.avatar}
                userName={fullName}
              />

              <div className="pt-3 border-t border-border/40 space-y-1">
                <p className="text-sm font-bold text-foreground">{fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Meta Info */}
          <ProfileInfoCard user={user} />
        </div>

        {/* Right Column: Edit Profile Form & Storage Details */}
        <div className="lg:col-span-7 space-y-6">
          <ProfileForm user={user} />

          {/* Cloudinary Integration Status Card */}
          <Card className="border-border/40 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Icon icon="lucide:cloud" className="size-4 text-sky-500" />
                Lưu Trữ Đám Mây Cloudinary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                Ảnh đại diện của bạn được tự động nén, cắt góc và lưu trữ bảo mật trên CDN của{' '}
                <strong className="text-foreground">Cloudinary</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border border-border/40">
                  <Icon icon="lucide:shield-check" className="size-4 text-emerald-500 shrink-0" />
                  <span>HTTPS Secure Delivery</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border border-border/40">
                  <Icon icon="lucide:sparkles" className="size-4 text-amber-500 shrink-0" />
                  <span>Auto Format & Face Crop</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
