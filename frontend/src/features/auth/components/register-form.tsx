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
        headerTitle="Kiểm tra hộp thư của bạn"
        headerDescription="Chúng tôi đã gửi liên kết kích hoạt đến email của bạn"
        backButtonLabel="Đã kích hoạt tài khoản?"
        backButtonText="Đăng nhập ngay"
        backButtonHref="/login"
      >
        <div className="space-y-5 text-center py-2">
          {/* Envelope Icon */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5">
            <Icon icon="lucide:mail-check" className="size-7" />
          </div>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Một liên kết kích hoạt đã được gửi tới địa chỉ:
            </p>
            <p className="font-semibold text-foreground text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-muted/60 inline-block break-all border border-border/50">
              {registeredEmail}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Vui lòng mở email và nhấn <strong>Kích Hoạt Tài Khoản</strong> để hoàn tất. Đừng quên kiểm tra hòm thư Rác (Spam) nếu chưa nhận được.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium text-xs sm:text-sm h-10 border-border/80 hover:bg-muted/50 rounded-xl"
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
              <Button type="button" className="w-full font-semibold shadow-sm hover:shadow transition-all rounded-xl h-10">
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
      headerDescription="Tạo tài khoản Mindly để bắt đầu quản lý đồ án"
      backButtonLabel="Đã có tài khoản?"
      backButtonText="Đăng nhập"
      backButtonHref="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-foreground/85">
            Địa chỉ Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="nguyenvanan@university.edu.vn"
            autoComplete="email"
            disabled={registerMutation.isPending}
            className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-foreground/85">
            Mật khẩu
          </Label>
          <PasswordInput
            id="password"
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            disabled={registerMutation.isPending}
            className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/85">
            Xác nhận mật khẩu
          </Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Nhập lại mật khẩu phía trên"
            autoComplete="new-password"
            disabled={registerMutation.isPending}
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
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
              Đang tạo tài khoản...
            </span>
          ) : (
            'Đăng Ký'
          )}
        </Button>

        <div className="relative my-3.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-card px-2.5 text-muted-foreground/80 font-medium">
              Hoặc tiếp tục với
            </span>
          </div>
        </div>

        <GoogleLoginButton text="signup_with" />
      </form>
    </AuthCardWrapper>
  );
}
