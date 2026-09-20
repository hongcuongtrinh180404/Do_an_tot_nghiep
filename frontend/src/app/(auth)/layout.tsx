import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-background">
      {/* Left Branding Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-5 relative flex-col justify-between p-12 bg-zinc-950 text-white overflow-hidden border-r border-border/20">
        {/* Background Ambient Gradients (No purple - Navy, Slate & Emerald accents) */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-sky-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 size-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="size-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Icon icon="lucide:graduation-cap" className="size-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">DATN PORTAL</span>
              <p className="text-xs text-zinc-400">Đồ Án Tốt Nghiệp Đại Học</p>
            </div>
          </Link>
        </div>

        {/* Center Content & Value Proposition */}
        <div className="relative z-10 my-auto py-12 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold tracking-wide border border-sky-500/20">
              <Icon icon="lucide:sparkles" className="size-3.5" />
              Nền Tảng Quản Lý Thông Minh
            </div>
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-snug">
              Số hóa toàn diện quy trình bảo vệ đồ án tốt nghiệp
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
              Hệ thống kết nối trực tiếp sinh viên, giảng viên hướng dẫn và hội đồng đánh giá.
              Minh bạch hóa tiến độ, chấm điểm và lưu trữ học liệu số.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Icon icon="lucide:check-circle-2" className="size-5 text-emerald-400 shrink-0" />
              <span>Theo dõi tiến độ duyệt đề tài theo thời gian thực</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Icon icon="lucide:check-circle-2" className="size-5 text-emerald-400 shrink-0" />
              <span>Tự động phân bổ lịch bảo vệ và hội đồng phản biện</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Icon icon="lucide:shield" className="size-5 text-sky-400 shrink-0" />
              <span>Bảo mật phiên làm việc đa tab với Session Grace Period</span>
            </div>
          </div>
        </div>

        {/* Bottom Panel Info */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80 text-xs text-zinc-500 flex items-center justify-between">
          <span>Học kỳ 2 — Năm học 2025 - 2026</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            Hệ thống trực tuyến
          </span>
        </div>
      </div>

      {/* Right Form Panel (Desktop & Mobile) */}
      <div className="col-span-1 lg:col-span-6 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 md:p-12 relative">
        {/* Top Mobile Bar / Back Button */}
        <div className="w-full flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
          >
            <Icon icon="lucide:arrow-left" className="size-3.5" />
            Về trang chủ
          </Link>

          <div className="lg:hidden flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              ĐA
            </div>
            <span className="text-sm font-bold">DATN Portal</span>
          </div>
        </div>

        {/* Centered Form */}
        <div className="my-auto flex justify-center items-center py-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          Bằng việc đăng nhập, bạn đồng ý với Quy chế Đào tạo và Chính sách Bảo mật của Nhà trường.
        </div>
      </div>
    </div>
  );
}
