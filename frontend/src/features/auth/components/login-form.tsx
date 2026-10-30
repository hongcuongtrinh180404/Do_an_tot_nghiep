'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleEnum } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { AuthCardWrapper } from './auth-card-wrapper';
import { PasswordInput } from './password-input';
import { GoogleLoginButton } from './google-login-button';
import { ForgotPasswordModal } from './forgot-password-modal';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';
import { useLoginMutation } from '../api/auth.api';

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = React.useState('');
  const [forgotPasswordSession, setForgotPasswordSession] = React.useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useLoginMutation();

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(
      {
        email: data.email.trim(),
        password: data.password,
      },
      {
        onSuccess: (authData) => {
          if (authData.user.role === RoleEnum.ADMIN) {
            router.push('/admin/dashboard');
          } else if (authData.user.role === RoleEnum.INSTRUCTOR) {
            router.push('/instructor/courses');
          } else {
            router.push('/');
          }
        },
      },
    );
  };

  return (
    <>
      <AuthCardWrapper
        headerTitle="Đăng Nhập"
        headerDescription="Học dễ dàng, hiểu sâu sắc"
        backButtonLabel="Chưa có tài khoản?"
        backButtonText="Đăng ký ngay"
        backButtonHref="/register"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-foreground/85">
              Địa chỉ Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nguyenvana@university.edu.vn"
              autoComplete="email"
              disabled={loginMutation.isPending}
              className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium text-foreground/85">
                Mật khẩu
              </Label>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loginMutation.isPending}
              className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                setForgotPasswordEmail(getValues('email') || '');
                setForgotPasswordSession((session) => session + 1);
                setIsForgotPasswordOpen(true);
              }}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-semibold transition-all rounded-xl shadow-sm hover:shadow active:scale-[0.99] mt-2"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
                Đang xác thực...
              </span>
            ) : (
              'Đăng Nhập'
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

          <GoogleLoginButton text="signin_with" />
        </form>
      </AuthCardWrapper>

      <ForgotPasswordModal
        key={forgotPasswordSession}
        open={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
        initialEmail={forgotPasswordEmail}
      />
    </>
  );
}
