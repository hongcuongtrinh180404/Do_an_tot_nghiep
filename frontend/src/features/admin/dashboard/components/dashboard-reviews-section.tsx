'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import type { DashboardPeriodType, IDashboardCoursePerformance } from '../types';
import { formatNumber } from '../constants/mock-dashboard-data';

interface DashboardReviewsSectionProps {
  globalPeriod: DashboardPeriodType;
  courses?: IDashboardCoursePerformance[];
  isLoading?: boolean;
}

export function DashboardReviewsSection({
  globalPeriod,
  courses = [],
  isLoading = false,
}: DashboardReviewsSectionProps): React.JSX.Element {
  const router = useRouter();
  const [periodOverride, setPeriodOverride] = React.useState<string>('default');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [minReviews, setMinReviews] = React.useState<number>(1);

  const isModified =
    periodOverride !== 'default' || categoryFilter !== 'all' || minReviews !== 1;

  const handleReset = () => {
    setPeriodOverride('default');
    setCategoryFilter('all');
    setMinReviews(1);
  };

  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [courses]);

  const eligibleCourses = React.useMemo(() => {
    return courses.filter((course) => {
      if (course.reviewCount < minReviews) return false;
      if (categoryFilter !== 'all' && course.category !== categoryFilter) return false;
      return true;
    });
  }, [courses, minReviews, categoryFilter]);

  const topRated = React.useMemo(() => {
    return [...eligibleCourses]
      .filter((c) => c.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }, [eligibleCourses]);

  const lowRated = React.useMemo(() => {
    return [...eligibleCourses]
      .filter((c) => c.rating > 0)
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 5);
  }, [eligibleCourses]);

  const handleInspectReview = (courseId: string) => {
    router.push(`/admin/reviews?search=${encodeURIComponent(courseId)}`);
  };

  return (
    <section className="bg-card rounded-2xl border border-border/60 shadow-xs p-5 space-y-5">
      {/* Header and Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Đánh giá Chất lượng Khóa học
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Xếp hạng dựa trên đánh giá hợp lệ sau kiểm duyệt và áp dụng ngưỡng tối thiểu số lượt đánh giá
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <select
            value={periodOverride}
            onChange={(e) => setPeriodOverride(e.target.value)}
            className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
          >
            <option value="default">Thời gian: Theo Dashboard</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="this_month">Tháng này</option>
            <option value="this_year">Năm nay</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
          >
            <option value="all">Danh mục: Tất cả</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Threshold Minimum Count */}
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
            <Icon icon="lucide:filter" className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Ngưỡng tối thiểu:
            </span>
            <select
              value={minReviews}
              onChange={(e) => setMinReviews(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-amber-800 dark:text-amber-300 outline-none cursor-pointer"
            >
              <option value="0">Tất cả đánh giá (≥ 0)</option>
              <option value="1">Tối thiểu 1 đánh giá</option>
              <option value="5">Tối thiểu 5 đánh giá</option>
              <option value="10">Tối thiểu 10 đánh giá</option>
              <option value="20">Tối thiểu 20 đánh giá</option>
            </select>
          </div>

          {/* Reset button */}
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition cursor-pointer"
            >
              <Icon icon="lucide:rotate-ccw" className="size-3" />
              <span>Khôi phục mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* 2 Equal Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Top 5 Highest Rated Courses */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Icon icon="lucide:award" className="size-4 text-emerald-600 dark:text-emerald-400" />
              Top 5 Khóa học được đánh giá cao nhất
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-card px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Tiêu chuẩn cao
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-500/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-card/60">
                  <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                  <th className="py-2.5 px-3">Tên khóa học & Giảng viên</th>
                  <th className="py-2.5 px-3 text-center">Điểm TB</th>
                  <th className="py-2.5 px-4 text-right">Đánh giá hợp lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                      Đang tải xếp hạng đánh giá...
                    </td>
                  </tr>
                ) : topRated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      Không có khóa học nào đạt ngưỡng ≥ {minReviews} đánh giá hợp lệ
                    </td>
                  </tr>
                ) : (
                  topRated.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-emerald-500/5 transition">
                      <td className="py-3 px-3 text-center font-extrabold text-emerald-600 dark:text-emerald-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <p
                          className="font-bold text-foreground truncate max-w-[210px]"
                          title={c.title}
                        >
                          {c.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{c.instructor}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tabular-nums">
                          {c.rating.toFixed(2)} ★
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-muted-foreground tabular-nums">
                        {formatNumber(c.reviewCount)} lượt
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Top 5 Lowest Rated Courses Needing Attention */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Icon icon="lucide:alert-circle" className="size-4 text-rose-600 dark:text-rose-400" />
              Top 5 Khóa học có đánh giá thấp nhất
            </span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-card px-2.5 py-0.5 rounded-full border border-rose-500/30">
              Cần rà soát
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-500/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-card/60">
                  <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                  <th className="py-2.5 px-3">Tên khóa học & Giảng viên</th>
                  <th className="py-2.5 px-3 text-center">Điểm TB</th>
                  <th className="py-2.5 px-3 text-right">Đánh giá</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                      Đang tải xếp hạng đánh giá...
                    </td>
                  </tr>
                ) : lowRated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      Không có khóa học nào đạt ngưỡng ≥ {minReviews} đánh giá hợp lệ
                    </td>
                  </tr>
                ) : (
                  lowRated.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-rose-500/5 transition">
                      <td className="py-3 px-3 text-center font-extrabold text-rose-600 dark:text-rose-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <p
                          className="font-bold text-foreground truncate max-w-[180px]"
                          title={c.title}
                        >
                          {c.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{c.instructor}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 tabular-nums">
                          {c.rating.toFixed(2)} ★
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-muted-foreground tabular-nums">
                        {formatNumber(c.reviewCount)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectReview(c.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-600 transition cursor-pointer whitespace-nowrap"
                        >
                          Kiểm tra
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
