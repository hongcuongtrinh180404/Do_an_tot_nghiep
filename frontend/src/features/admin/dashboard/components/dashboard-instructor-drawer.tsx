'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import type { IDashboardInstructor } from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import {
  formatCompactVnd,
  formatNumber,
} from '../constants/mock-dashboard-data';

interface DashboardInstructorDrawerProps {
  instructor: IDashboardInstructor | null;
  onClose: () => void;
}

export function DashboardInstructorDrawer({
  instructor,
  onClose,
}: DashboardInstructorDrawerProps): React.JSX.Element | null {
  const router = useRouter();

  if (!instructor) return null;

  const courses = instructor.courses ?? [];

  const handleNavigateToInstructors = () => {
    onClose();
    router.push('/admin/instructors');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <aside className="fixed top-0 right-0 z-50 h-screen w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <h3 className="text-sm font-bold text-foreground">
            Chi tiết Hồ sơ & Doanh thu Giảng viên
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <Icon icon="lucide:x" className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Profile Card */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <div
              className={`size-12 rounded-2xl ${instructor.avatarBg} font-extrabold text-base flex items-center justify-center shrink-0 border border-border/60`}
            >
              {instructor.initials}
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-foreground truncate">
                {instructor.name}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {instructor.specialty} • {instructor.email}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Hoa hồng: {instructor.commissionRate}%
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                  <Icon icon="lucide:star" className="size-3 fill-amber-500 text-amber-500" />
                  {instructor.avgRating} ★
                </span>
              </div>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-card border border-border/80">
              <p className="text-[11px] text-muted-foreground">Lượt bán kỳ lọc</p>
              <p className="text-base font-extrabold text-foreground mt-0.5 tabular-nums">
                {formatNumber(instructor.salesCount)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-[11px] text-primary">Tổng doanh thu</p>
              <p className="text-sm font-extrabold text-primary mt-0.5 tabular-nums">
                {formatCompactVnd(instructor.grossRevenue)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">Thực nhận</p>
              <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400 mt-0.5 tabular-nums">
                {formatCompactVnd(instructor.netRevenue)}
              </p>
            </div>
          </div>

          {/* Courses List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-foreground">
                Các khóa học đang giảng dạy ({courses.length})
              </p>
              <span className="text-[11px] text-muted-foreground">
                Tổng công khai: {instructor.coursesCount} khóa
              </span>
            </div>

            <div className="space-y-2.5">
              {courses.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/40">
                  Chưa có chi tiết danh sách khóa học con trong cơ sở dữ liệu
                </div>
              ) : (
                courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-3 rounded-xl border border-border/60 hover:border-primary/40 bg-card transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-foreground leading-snug">
                        {course.title}
                      </p>
                      <span
                        className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          course.isFree
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {course.isFree ? 'Miễn phí' : formatVnd(course.price)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <span>
                        Học viên:{' '}
                        <strong className="text-foreground font-semibold tabular-nums">
                          {formatNumber(course.totalStudents)}
                        </strong>
                      </span>
                      <span className="flex items-center gap-0.5">
                        Đánh giá:{' '}
                        <strong className="text-amber-500 font-semibold tabular-nums">
                          {course.rating.toFixed(2)} ★
                        </strong>{' '}
                        ({course.reviewCount})
                      </span>
                      <span>
                        Doanh thu:{' '}
                        <strong className="text-foreground font-bold tabular-nums">
                          {course.isFree ? '0 ₫' : formatCompactVnd(course.revenue)}
                        </strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleNavigateToInstructors}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Mở trang quản lý giảng viên</span>
            <Icon icon="lucide:external-link" className="size-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
}
