'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_CONSTANTS } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { AuthCardWrapper } from './auth-card-wrapper';
import { PasswordInput } from './password-input';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '../schemas/reset-password.schema';
import { useResetPasswordMutation } from '../api/auth.api';

const REDIRECT_DELAY_MS = 3000;

export function ResetPasswordContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token')?.trim() || null;

  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetMutation = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace('/login');
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isSuccess, router]);

  const onSubmit = (data: ResetPasswordFormData): void => {
    if (!token) {
      return;
    }

    setApiError(null);
    resetMutation.mutate(
      { token, password: data.password },
      {
        onSuccess: () => setIsSuccess(true),
        onError: (error: unknown) => {
          const message =
            error && typeof error === 'object' && 'response' in error
              ? (error as { response?: { data?: { message?: string } } }).response?.data
                  ?.message
              : undefined;
          setApiError(
            message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.',
          );
        },
      },
    );
  };

  if (!token) {
    return (
      <AuthCardWrapper
        headerTitle="Thiết Lập Mật Khẩu"
        headerDescription="Liên kết không hợp lệ"
        backButtonLabel="Cần liên kết mới?"
        backButtonText="Quay lại đăng nhập"
        backButtonHref="/login"
      >
        <div className="space-y-6 py-2 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
            <Icon icon="lucide:link-2-off" className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-foreground">
              Không tìm thấy liên kết
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE} Vui lòng quay lại
              trang đăng nhập và yêu cầu một liên kết đặt lại mật khẩu mới.
            </p>
          </div>
          <Link href="/login" className="block w-full">
            <Button className="w-full font-semibold">Quay lại đăng nhập</Button>
          </Link>
        </div>
      </AuthCardWrapper>
    );
  }

  if (isSuccess) {
    return (
      <AuthCardWrapper
        headerTitle="Thiết Lập Mật Khẩu"
        headerDescription="Mật khẩu đã được cập nhật"
        backButtonLabel="Đã có mật khẩu mới?"
        backButtonText="Đăng nhập ngay"
        backButtonHref="/login"
      >
        <div className="space-y-6 py-2 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
            <Icon icon="lucide:shield-check" className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-foreground">
              Thiết lập mật khẩu thành công
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bạn sẽ được chuyển về trang đăng nhập sau vài giây. Vui lòng đăng nhập
              bằng mật khẩu mới.
            </p>
          </div>
          <Link href="/login" className="block w-full">
            <Button className="w-full font-semibold">Đăng nhập ngay</Button>
          </Link>
        </div>
      </AuthCardWrapper>
    );
  }

  return (
    <AuthCardWrapper
      headerTitle="Thiết Lập Mật Khẩu"
      headerDescription="Tạo hoặc đặt lại mật khẩu đăng nhập Mindly"
      backButtonLabel="Đã có mật khẩu?"
      backButtonText="Đăng nhập"
      backButtonHref="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        {apiError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <Icon icon="lucide:alert-circle" className="mt-0.5 size-4 shrink-0" />
            <span className="leading-relaxed">{apiError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-xs font-medium text-foreground/85">
            Mật khẩu mới
          </Label>
          <PasswordInput
            id="new-password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={resetMutation.isPending}
            className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirm-new-password"
            className="text-xs font-medium text-foreground/85"
          >
            Xác nhận mật khẩu mới
          </Label>
          <PasswordInput
            id="confirm-new-password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={resetMutation.isPending}
            className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10 font-semibold transition-all rounded-xl shadow-sm hover:shadow active:scale-[0.99] mt-2"
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
              Đang lưu...
            </span>
          ) : (
            'Lưu mật khẩu Mindly'
          )}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Liên kết này chỉ sử dụng được một lần và hết hạn sau 15 phút.
          {' '}Nếu đã liên kết Google, bạn vẫn có thể đăng nhập bằng Google.
        </p>
      </form>
    </AuthCardWrapper>
  );
}
