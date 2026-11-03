'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useUserProfileQuery } from '../api/profile.api';
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
        <div className="size-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">
          Đang tải dữ liệu hồ sơ cá nhân...
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
          Vui lòng đăng nhập vào tài khoản để xem và quản lý thông tin hồ sơ của bạn trên Mindly.
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
            <span className="text-foreground font-medium">Hồ sơ cá nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Hồ Sơ Cá Nhân
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Quản lý thông tin định danh công khai, ảnh đại diện và thông tin cá nhân của bạn.
          </p>
        </div>

        <Link
          href="/settings"
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'h-9 px-3.5 text-xs font-medium shrink-0',
          })}
        >
          <Icon icon="lucide:settings" className="size-3.5 mr-1.5 text-muted-foreground" />
          Cài đặt tài khoản
        </Link>
      </div>

      {/* Main Grid: Left (Identity Summary) + Right (Profile Form & Privacy) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Identity Summary Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <ProfileInfoCard user={user} />
        </div>

        {/* Right Column: Edit Profile Form & Privacy Guidelines */}
        <div className="lg:col-span-8 space-y-6">
          <ProfileForm user={user} />

          {/* Privacy & Account Guidelines Card */}
          <Card className="border border-border/70 bg-card shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Icon icon="lucide:shield-alert" className="size-4 text-muted-foreground" />
                Quyền Riêng Tư & Bảo Mật
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                Họ và tên hiển thị cùng ảnh đại diện của bạn sẽ xuất hiện công khai trên các chứng nhận hoàn thành khóa học, bài thảo luận và tương tác trực tiếp trong video bài giảng.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
                  <Icon
                    icon="lucide:check-circle"
                    className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-foreground block mb-0.5">Bảo mật địa chỉ Email</span>
                    <span className="text-[11px] leading-normal">
                      Email của bạn luôn được ẩn đối với những người dùng khác trong hệ thống.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
                  <Icon icon="lucide:lock" className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground block mb-0.5">Xác thực an toàn</span>
                    <span className="text-[11px] leading-normal">
                      Để thay đổi mật khẩu hoặc email đăng nhập, hãy truy cập{' '}
                      <Link href="/settings" className="underline hover:text-foreground font-medium">
                        Cài đặt tài khoản
                      </Link>
                      .
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
