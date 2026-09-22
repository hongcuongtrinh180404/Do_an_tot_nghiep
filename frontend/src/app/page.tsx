'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrentUserQuery, useLogoutMutation } from '@/features/auth/api/auth.api';
import { LoginForm } from '@/features/auth/components/login-form';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { useIsMounted } from '@/hooks/use-is-mounted';

export default function Home(): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: user, isLoading } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6 sm:p-12 md:p-16 bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow">
            ĐA
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">DATN Portal</h2>
            <p className="text-xs text-muted-foreground">Đồ án tốt nghiệp đại học</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/40">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API: 8000 | FE: 3000</span>
          </div>

          <div className="flex items-center gap-2">
            {isMounted && user ? (
              <>
                <Link
                  href="/profile"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <Icon icon="lucide:user" className="size-3.5 mr-1.5" />
                  Hồ Sơ Cá Nhân
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <Icon icon="lucide:log-out" className="size-3.5 mr-1" />
                  Thoát
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <Icon icon="lucide:log-in" className="size-3.5 mr-1.5" />
                  Đăng Nhập
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({ size: 'sm' })}
                >
                  <Icon icon="lucide:user-plus" className="size-3.5 mr-1.5" />
                  Đăng Ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl my-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12">
        {/* Left Side: Information & Architecture Badges */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
            <Icon icon="lucide:radio" className="size-3 animate-spin" />
            TanStack Query + Next.js App Router
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Nền Tảng Quản Lý <br />
            <span className="text-primary bg-clip-text">Đồ Án Tốt Nghiệp</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            Hệ thống Full-stack Monorepo với Frontend Next.js App Router, Shadcn UI, TanStack Query,
            và Backend NestJS MongoDB có bảo vệ phiên đa tab 30s Grace Period.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/login"
              className={buttonVariants({ size: 'lg', className: 'shadow-md' })}
            >
              Đến trang Đăng Nhập
              <Icon icon="lucide:arrow-right" className="size-4 ml-2" />
            </Link>
            <Link
              href="/register"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              Tạo tài khoản sinh viên / giảng viên
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50">
              <Icon icon="lucide:layers" className="size-5 text-sky-500" />
              <div>
                <p className="text-xs font-medium text-foreground">App Router</p>
                <p className="text-[11px] text-muted-foreground">Next.js 16</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50">
              <Icon icon="lucide:radio" className="size-5 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-foreground">TanStack Query</p>
                <p className="text-[11px] text-muted-foreground">Server State v5</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50">
              <Icon icon="lucide:database" className="size-5 text-emerald-500" />
              <div>
                <p className="text-xs font-medium text-foreground">NestJS + Mongo</p>
                <p className="text-[11px] text-muted-foreground">Clean Repository</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form or User Session Profile */}
        <div className="lg:col-span-5 flex justify-center">
          {!isMounted || isLoading ? (
            <Card className="w-full max-w-md p-8 flex flex-col items-center justify-center space-y-4 shadow-lg border-border/40">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập...</p>
            </Card>
          ) : user ? (
            <Card className="w-full max-w-md shadow-xl border-border/40 bg-card">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto size-20 rounded-full border-2 border-primary/20 p-0.5 mb-2 overflow-hidden relative flex items-center justify-center bg-primary/10">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.email}
                      fill
                      sizes="80px"
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <Icon icon="lucide:user-circle-2" className="size-12 text-primary" />
                  )}
                </div>
                <CardTitle className="text-xl font-bold">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </CardTitle>
                <CardDescription className="text-xs">{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-sm">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                  <span className="text-muted-foreground text-xs">Vai trò (Role)</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    <Icon icon="lucide:shield-check" className="size-3.5" />
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                  <span className="text-muted-foreground text-xs">Phương thức xác thực</span>
                  <span className="text-xs font-medium">{user.provider}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                  <span className="text-muted-foreground text-xs">Trạng thái tài khoản</span>
                  <span className="text-xs font-medium text-emerald-600">{user.status}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex flex-col gap-2">
                <Link
                  href="/profile"
                  className={buttonVariants({ className: 'w-full shadow-xs' })}
                >
                  <Icon icon="lucide:user-cog" className="size-4 mr-2" />
                  Quản Lý Hồ Sơ & Avatar
                </Link>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <Icon icon="lucide:log-out" className="size-4 mr-2" />
                  {logoutMutation.isPending ? 'Đang đăng xuất...' : 'Đăng Xuất'}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        © 2026 Đồ Án Tốt Nghiệp — Kiến trúc Monorepo NestJS + Next.js App Router
      </footer>
    </main>
  );
}
