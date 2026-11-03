'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AuthCardWrapper } from './auth-card-wrapper';
import { useVerifyEmailChangeMutation } from '../api/auth.api';

export function VerifyEmailChangeContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || null;
  const hasTriggeredRef = useRef(false);

  const verifyMutation = useVerifyEmailChangeMutation();

  // Tự động kích hoạt xác thực khi trang được tải kèm token
  useEffect(() => {
    if (token && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      verifyMutation.mutate({ token });
    }
  }, [token, verifyMutation]);

  // Trạng thái 1: Đang xác thực
  if (verifyMutation.isPending) {
    return (
      <AuthCardWrapper
        headerTitle="Đang Xác Thực"
        headerDescription="Đang kiểm tra mã xác nhận thay đổi email của bạn"
        backButtonLabel="Gặp sự cố?"
        backButtonText="Quay lại đăng nhập"
        backButtonHref="/login"
      >
        <div className="py-8 space-y-5 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 ring-8 ring-sky-500/5">
            <Icon icon="lucide:loader-2" className="size-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground">Đang xác nhận email mới...</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Vui lòng giữ nguyên màn hình trong khi hệ thống cập nhật email và đồng bộ bảo mật tài khoản.
            </p>
          </div>
        </div>
      </AuthCardWrapper>
    );
  }

  // Trạng thái 2: Xác thực và cập nhật email thành công
  if (verifyMutation.isSuccess) {
    const newEmail = verifyMutation.data?.email;
    return (
      <AuthCardWrapper
        headerTitle="Cập Nhật Thành Công"
        headerDescription="Địa chỉ email tài khoản đã được thay đổi"
        backButtonLabel="Khám phá ngay"
        backButtonText="Vào trang chủ"
        backButtonHref="/"
      >
        <div className="py-4 space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
            <Icon icon="lucide:check-circle-2" className="size-8 text-emerald-500" />
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-lg text-foreground">
              Thay đổi email hoàn tất!
            </h3>
            {newEmail && (
              <p className="text-sm font-medium font-mono text-foreground bg-muted/50 py-1 px-3 rounded-lg inline-block border border-border/50">
                {newEmail}
              </p>
            )}
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed pt-2">
              Để đảm bảo an toàn, các phiên đăng nhập trước đã được đăng xuất và thông báo bảo mật đã được gửi tới email cũ. Vui lòng đăng nhập lại với email mới.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className={buttonVariants({
                className: 'w-full h-10 font-semibold text-sm rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors',
              })}
            >
              <Icon icon="lucide:log-in" className="size-4 mr-2" />
              Đăng nhập bằng email mới
            </Link>
          </div>
        </div>
      </AuthCardWrapper>
    );
  }

  // Trạng thái 3: Xác thực thất bại hoặc thiếu token
  const errorMessage =
    (verifyMutation.error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (!token
      ? 'Không tìm thấy mã xác nhận trong đường dẫn.'
      : 'Liên kết xác nhận thay đổi email không hợp lệ hoặc đã hết hạn.');

  return (
    <AuthCardWrapper
      headerTitle="Xác Thực Thất Bại"
      headerDescription="Không thể hoàn tất thay đổi email"
      backButtonLabel="Cần trợ giúp?"
      backButtonText="Quay lại đăng nhập"
      backButtonHref="/login"
    >
      <div className="py-4 space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
          <Icon icon="lucide:alert-circle" className="size-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-lg text-foreground">
            Liên kết không hợp lệ
          </h3>
          <p className="text-xs text-destructive font-medium max-w-xs mx-auto">
            {errorMessage}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed pt-1">
            Liên kết xác nhận đổi email chỉ có hiệu lực trong vòng 15 phút và chỉ được dùng một lần. Bạn có thể đăng nhập lại vào tài khoản để gửi yêu cầu mới.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/login"
            className={buttonVariants({
              className: 'w-full h-10 font-semibold text-sm rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors',
            })}
          >
            <Icon icon="lucide:log-in" className="size-4 mr-2" />
            Đăng nhập tài khoản
          </Link>
          <Link
            href="/"
            className={buttonVariants({
              variant: 'outline',
              className: 'w-full h-10 text-sm rounded-xl',
            })}
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </AuthCardWrapper>
  );
}

