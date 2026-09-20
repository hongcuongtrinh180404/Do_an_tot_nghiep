'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCardWrapper } from './auth-card-wrapper';
import { PasswordInput } from './password-input';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';
import { useLoginMutation } from '../api/auth.api';

export function LoginForm(): React.JSX.Element {
  const router = useRouter();

  const {
    register,
    handleSubmit,
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
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push('/');
      },
    });
  };

  return (
    <AuthCardWrapper
      headerTitle="Đăng Nhập"
      headerDescription="Cổng thông tin quản lý Đồ án tốt nghiệp"
      backButtonLabel="Chưa có tài khoản?"
      backButtonText="Đăng ký ngay"
      backButtonHref="/register"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Địa chỉ Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nguyenvana@university.edu.vn"
            autoComplete="email"
            disabled={loginMutation.isPending}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mật khẩu</Label>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loginMutation.isPending}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full font-semibold transition-all shadow-md hover:shadow-lg mt-2"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Đang xác thực...' : 'Đăng Nhập'}
        </Button>
      </form>
    </AuthCardWrapper>
  );
}
