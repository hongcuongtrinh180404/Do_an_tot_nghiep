'use client';

import React from 'react';
import { LoginForm } from '@/features/auth/components/login-form';
import { useCurrentUserQuery, useLogoutMutation } from '@/features/auth/api/auth.api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LogOut, UserCircle2, ShieldCheck, Database, Layers, Radio } from 'lucide-react';

export default function Home(): React.JSX.Element {
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/40">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API: 8000 | FE: 3000</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl my-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12">
        {/* Left Side: Information & Architecture Badges */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
            <Radio className="size-3 animate-spin" />
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50">
              <Layers className="size-5 text-sky-500" />
              <div>
                <p className="text-xs font-medium text-foreground">App Router</p>
                <p className="text-[11px] text-muted-foreground">Next.js 16</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50">
              <Radio className="size-5 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-foreground">TanStack Query</p>
                <p className="text-[11px] text-muted-foreground">Server State v5</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50">
              <Database className="size-5 text-emerald-500" />
              <div>
                <p className="text-xs font-medium text-foreground">NestJS + Mongo</p>
                <p className="text-[11px] text-muted-foreground">Clean Repository</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form or User Session Profile */}
        <div className="lg:col-span-5 flex justify-center">
          {isLoading ? (
            <Card className="w-full max-w-md p-8 flex flex-col items-center justify-center space-y-4 shadow-lg border-border/40">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập...</p>
            </Card>
          ) : user ? (
            <Card className="w-full max-w-md shadow-xl border-border/40 bg-card">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <UserCircle2 className="size-10" />
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
                    <ShieldCheck className="size-3.5" />
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
              <CardFooter className="pt-2">
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="size-4 mr-2" />
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
