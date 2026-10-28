'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { AuthCardWrapper } from './auth-card-wrapper';
import { PasswordInput } from './password-input';
import { GoogleLoginButton } from './google-login-button';
import { registerSchema, type RegisterFormData } from '../schemas/register.schema';
import { useRegisterMutation, useResendVerificationMutation } from '../api/auth.api';

export function RegisterForm(): React.JSX.Element {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const registerMutation = useRegisterMutation();
  const resendMutation = useResendVerificationMutation();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(
      {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      {
        onSuccess: () => {
          setRegisteredEmail(data.email.trim());
          setResendCooldown(60);
        },
      },
    );
  };

  const handleResend = () => {
    if (!registeredEmail || resendCooldown > 0 || resendMutation.isPending) return;
    resendMutation.mutate(
      { email: registeredEmail },
      {
        onSuccess: () => {
          setResendCooldown(60);
        },
      },
    );
  };

  if (registeredEmail) {
    return (
      <AuthCardWrapper
        headerTitle="Kiểm Tra Email Của Bạn"
        headerDescription="Chúng tôi đã gửi hướng dẫn kích hoạt tài khoản"
        backButtonLabel="Đã kích hoạt tài khoản?"
        backButtonText="Đăng nhập ngay"
        backButtonHref="/login"
      >
        <div className="space-y-6 text-center py-2">
          {/* Envelope Icon with glow */}
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 ring-8 ring-sky-500/5">
            <Icon icon="lucide:mail-check" className="size-8" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Một liên kết kích hoạt đã được gửi tới địa chỉ email:
            </p>
            <p className="font-semibold text-foreground text-sm px-3 py-1.5 rounded-lg bg-muted/60 inline-block break-all border border-border/40">
              {registeredEmail}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed pt-2">
              Vui lòng mở hộp thư và nhấn vào nút <strong>Kích Hoạt Tài Khoản</strong> để hoàn tất đăng ký. 
              Nếu không tìm thấy, vui lòng kiểm tra hộp thư Rác (Spam).
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium text-xs sm:text-sm h-10 border-border/80 hover:bg-muted/50"
              disabled={resendCooldown > 0 || resendMutation.isPending}
              onClick={handleResend}
            >
              {resendMutation.isPending ? (
                <>
                  <Icon icon="lucide:loader-2" className="mr-2 size-4 animate-spin" />
                  Đang gửi lại...
                </>
              ) : resendCooldown > 0 ? (
                `Gửi lại email sau (${resendCooldown}s)`
              ) : (
                <>
                  <Icon icon="lucide:refresh-cw" className="mr-2 size-3.5" />
                  Gửi lại email kích hoạt
                </>
              )}
            </Button>

            <Link href="/login" className="block w-full">
              <Button type="button" className="w-full font-semibold shadow-md">
                Chuyển Đến Trang Đăng Nhập
              </Button>
            </Link>
          </div>
        </div>
      </AuthCardWrapper>
    );
  }

  return (
    <AuthCardWrapper
      headerTitle="Đăng Ký Tài Khoản"
      headerDescription="Tạo tài khoản mới để tham gia hệ thống quản lý đồ án"
      backButtonLabel="Đã có tài khoản?"
      backButtonText="Đăng nhập"
      backButtonHref="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Họ và tên đệm</Label>
            <Input
              id="firstName"
              placeholder="Nguyễn Văn"
              autoComplete="given-name"
              disabled={registerMutation.isPending}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-xs font-medium text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName">Tên</Label>
            <Input
              id="lastName"
              placeholder="An"
              autoComplete="family-name"
              disabled={registerMutation.isPending}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-xs font-medium text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Địa chỉ Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nguyenvanan@university.edu.vn"
            autoComplete="email"
            disabled={registerMutation.isPending}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <PasswordInput
            id="password"
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            disabled={registerMutation.isPending}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Nhập lại mật khẩu trên"
            autoComplete="new-password"
            disabled={registerMutation.isPending}
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
          className="w-full font-semibold transition-all shadow-md hover:shadow-lg mt-2"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground font-medium">
              Hoặc đăng ký nhanh với
            </span>
          </div>
        </div>

        <GoogleLoginButton text="signup_with" />
      </form>
    </AuthCardWrapper>
  );
}
