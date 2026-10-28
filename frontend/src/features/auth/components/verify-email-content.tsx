'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { AuthCardWrapper } from './auth-card-wrapper';
import { useVerifyEmailMutation, useResendVerificationMutation } from '../api/auth.api';

export function VerifyEmailContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || null;

  const [resendEmail, setResendEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const hasTriggeredRef = useRef(false);

  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto trigger verification on mount if token is present
  useEffect(() => {
    if (token && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      verifyMutation.mutate({ token });
    }
  }, [token, verifyMutation]);

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || resendCooldown > 0 || resendMutation.isPending) return;

    resendMutation.mutate(
      { email: resendEmail.trim() },
      {
        onSuccess: () => {
          setResendCooldown(60);
        },
      },
    );
  };

  // State 1: Verification In Progress
  if (verifyMutation.isPending) {
    return (
      <AuthCardWrapper
        headerTitle="Đang Xác Thực"
        headerDescription="Đang kiểm tra mã kích hoạt của bạn"
        backButtonLabel="Gặp sự cố?"
        backButtonText="Quay lại đăng nhập"
        backButtonHref="/login"
      >
        <div className="py-8 space-y-5 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 ring-8 ring-sky-500/5">
            <Icon icon="lucide:loader-2" className="size-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground">Đang xác thực tài khoản...</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Vui lòng giữ nguyên màn hình trong khi hệ thống hoàn tất quá trình kích hoạt tài khoản.
            </p>
          </div>
        </div>
      </AuthCardWrapper>
    );
  }

  // State 2: Verification Successful
  if (verifyMutation.isSuccess) {
    const user = verifyMutation.data?.user;
    return (
      <AuthCardWrapper
        headerTitle="Kích Hoạt Thành Công"
        headerDescription="Tài khoản của bạn đã sẵn sàng sử dụng"
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
              Chào mừng {user?.fullName || user?.firstName || 'bạn'}!
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Địa chỉ email <strong>{user?.email}</strong> đã được xác thực thành công. Bạn đã được tự động đăng nhập vào hệ thống.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link href="/" className="block w-full">
              <Button className="w-full font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
                <Icon icon="lucide:sparkles" className="mr-2 size-4" />
                Vào Bảng Điều Khiển Học Tập
              </Button>
            </Link>
            <Link href="/login" className="block w-full">
              <Button variant="outline" className="w-full font-medium text-xs sm:text-sm">
                Quay lại trang Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </AuthCardWrapper>
    );
  }

  // State 3: Token Invalid / Expired OR State 4: No Token
  const errorObj = verifyMutation.error as { response?: { data?: { message?: string } } } | null;
  const errorMessage =
    errorObj?.response?.data?.message ||
    (token
      ? 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
      : 'Không tìm thấy mã xác thực trong đường dẫn.');

  return (
    <AuthCardWrapper
      headerTitle="Xác Thực Email"
      headerDescription="Kích hoạt tài khoản để tiếp tục"
      backButtonLabel="Đã có tài khoản hoạt động?"
      backButtonText="Đăng nhập"
      backButtonHref="/login"
    >
      <div className="py-2 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
            <Icon icon="lucide:alert-circle" className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-base">
              {token ? 'Liên kết không khả dụng' : 'Yêu cầu liên kết xác thực'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>

        <form onSubmit={handleResend} className="space-y-3 pt-1 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center">
            Nhập email của bạn dưới đây để nhận liên kết xác thực mới:
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="resendEmail">Địa chỉ Email</Label>
            <Input
              id="resendEmail"
              type="email"
              placeholder="nguyenvanan@university.edu.vn"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              disabled={resendMutation.isPending}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full font-semibold shadow-md mt-2"
            disabled={!resendEmail.trim() || resendCooldown > 0 || resendMutation.isPending}
          >
            {resendMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="mr-2 size-4 animate-spin" />
                Đang gửi email...
              </>
            ) : resendCooldown > 0 ? (
              `Thử lại sau (${resendCooldown}s)`
            ) : (
              <>
                <Icon icon="lucide:send" className="mr-2 size-3.5" />
                Gửi Lại Liên Kết Kích Hoạt
              </>
            )}
          </Button>

          <Link href="/login" className="block w-full pt-1">
            <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground">
              Quay lại Đăng nhập
            </Button>
          </Link>
        </form>
      </div>
    </AuthCardWrapper>
  );
}
