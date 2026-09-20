'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLoginMutation } from '../api/auth.api';

const loginSchema = z.object({
  email: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng')),
  password: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự')),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm(): React.JSX.Element {
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
    loginMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/40 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Đăng Nhập Hệ Thống</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Đăng nhập với email và mật khẩu của bạn
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@domain.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive font-medium">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="w-full font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Đang xác thực...' : 'Đăng Nhập'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
