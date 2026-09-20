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
import { registerSchema, type RegisterFormData } from '../schemas/register.schema';
import { useRegisterMutation } from '../api/auth.api';

export function RegisterForm(): React.JSX.Element {
  const router = useRouter();

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
          router.push('/');
        },
      },
    );
  };

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
      </form>
    </AuthCardWrapper>
  );
}
