'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { DashboardPeriodType } from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import {
  COURSES_PERFORMANCE_DATA,
  formatNumber,
} from '../constants/mock-dashboard-data';

type CourseTabType = 'revenue' | 'enrollment' | 'completion';

interface DashboardCoursesSectionProps {
  globalPeriod: DashboardPeriodType;
}

export function DashboardCoursesSection({
  globalPeriod,
}: DashboardCoursesSectionProps): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<CourseTabType>('revenue');
  const [periodOverride, setPeriodOverride] = React.useState<string>('default');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [instructorFilter, setInstructorFilter] = React.useState<string>('all');

  const isModified =
    periodOverride !== 'default' || categoryFilter !== 'all' || instructorFilter !== 'all';

  const handleReset = () => {
    setPeriodOverride('default');
    setCategoryFilter('all');
    setInstructorFilter('all');
  };

  const effectivePeriod = periodOverride === 'default' ? globalPeriod : periodOverride;

  const filteredCourses = React.useMemo(() => {
    const scaleMap: Record<string, number> = {
      today: 0.06,
      yesterday: 0.05,
      '7d': 0.32,
      '30d': 1.2,
      this_month: 1.0,
      last_month: 1.22,
      this_year: 9.5,
      custom: 0.4,
    };
    const factor = scaleMap[effectivePeriod] || 1;

    return COURSES_PERFORMANCE_DATA.filter((course) => {
      if (categoryFilter !== 'all' && course.category !== categoryFilter) return false;
      if (instructorFilter !== 'all' && course.instructor !== instructorFilter) return false;
      return true;
    }).map((course) => ({
      ...course,
      salesCount: Math.max(1, Math.round(course.salesCount * factor)),
      revenue: Math.round(course.revenue * factor),
      newEnrollments: Math.max(1, Math.round(course.newEnrollments * factor)),
    }));
  }, [categoryFilter, instructorFilter, effectivePeriod]);

  const sortedCourses = React.useMemo(() => {
    const list = [...filteredCourses];
    if (activeTab === 'revenue') {
      return list.filter((c) => !c.isFree).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }
    if (activeTab === 'enrollment') {
      return list.sort((a, b) => b.newEnrollments - a.newEnrollments).slice(0, 10);
    }
    return list.sort((a, b) => b.completionRate - a.completionRate).slice(0, 10);
  }, [filteredCourses, activeTab]);

  const ruleNote = React.useMemo(() => {
    if (activeTab === 'enrollment') {
      return 'Phân biệt rõ đăng ký Miễn phí & Trả phí; không tính đơn chưa hoàn tất thanh toán.';
    }
    if (activeTab === 'completion') {
      return 'Tỷ lệ hoàn thành = Học viên hoàn thành / Tổng học viên đã bắt đầu học.';
    }
    return 'Chỉ tính các đơn hàng đã hoàn tất thanh toán hợp lệ.';
  }, [activeTab]);

  return (
    <section className="bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden">
      {/* Header and Tabs */}
      <div className="p-5 border-b border-border/60 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Phân tích Hiệu suất Khóa học
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Đánh giá doanh thu, quy mô ghi danh thực tế và tỷ lệ hoàn thành bài giảng của học viên
            </p>
          </div>

          {/* 3 Tabs */}
          <div className="inline-flex flex-wrap bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'revenue'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              Tab A: Top 10 Doanh thu cao nhất
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('enrollment')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'enrollment'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              Tab B: Top 10 Nhiều lượt đăng ký nhất
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'completion'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              Tab C: Top Tỷ lệ hoàn thành cao
            </button>
          </div>
        </div>

        {/* Sub-Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period */}
            <select
              value={periodOverride}
              onChange={(e) => setPeriodOverride(e.target.value)}
              className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
            >
              <option value="default">Thời gian: Theo Dashboard</option>
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày gần nhất</option>
              <option value="this_month">Tháng này</option>
              <option value="this_year">Năm nay</option>
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
            >
              <option value="all">Danh mục: Tất cả</option>
              <option value="Lập trình Web & Backend">Lập trình Web & Backend</option>
              <option value="AI & Khoa học Dữ liệu">AI & Khoa học Dữ liệu</option>
              <option value="Thiết kế UI/UX & Đồ họa">Thiết kế UI/UX & Đồ họa</option>
              <option value="Kinh doanh & Marketing">Kinh doanh & Marketing</option>
            </select>

            {/* Instructor */}
            <select
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
            >
              <option value="all">Giảng viên: Tất cả</option>
              <option value="Nguyễn Minh Quân">Nguyễn Minh Quân</option>
              <option value="Trần Thị Lan Anh">Trần Thị Lan Anh</option>
              <option value="Lê Hoàng Nam">Lê Hoàng Nam</option>
              <option value="Phạm Thu Hà">Phạm Thu Hà</option>
              <option value="Đặng Quốc Bảo">Đặng Quốc Bảo</option>
              <option value="Hoàng Ngọc Diệp">Hoàng Ngọc Diệp</option>
            </select>

            {/* Reset */}
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

          <span className="text-[11px] text-muted-foreground italic">{ruleNote}</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {sortedCourses.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : activeTab === 'revenue' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-5 w-14 text-center">#</th>
                <th className="py-3 px-4">Khóa học</th>
                <th className="py-3 px-4">Giảng viên</th>
                <th className="py-3 px-4 text-right">Giá khóa học</th>
                <th className="py-3 px-4 text-right">Số lượt mua thành công</th>
                <th className="py-3 px-5 text-right">Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {sortedCourses.map((c, idx) => (
                <tr key={c.id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-5 text-center font-bold text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-10 rounded-lg ${c.thumbnailBg} font-bold text-[10px] flex items-center justify-center shrink-0 border border-border/60`}
                      >
                        {c.thumbnailText}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate max-w-xs sm:max-w-sm">
                          {c.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{c.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">{c.instructor}</td>
                  <td className="py-3 px-4 text-right font-semibold text-muted-foreground tabular-nums">
                    {formatVnd(c.price)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                    {formatNumber(c.salesCount)} lượt
                  </td>
                  <td className="py-3 px-5 text-right font-extrabold text-primary tabular-nums">
                    {formatVnd(c.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'enrollment' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-5 w-14 text-center">#</th>
                <th className="py-3 px-4">Tên khóa học</th>
                <th className="py-3 px-4">Giảng viên</th>
                <th className="py-3 px-4 text-center">Phân loại</th>
                <th className="py-3 px-4 text-right">Lượt đăng ký mới trong kỳ</th>
                <th className="py-3 px-5 text-right">Tổng học viên đang sở hữu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {sortedCourses.map((c, idx) => (
                <tr key={c.id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-5 text-center font-bold text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-bold text-foreground">{c.title}</td>
                  <td className="py-3 px-4 text-muted-foreground font-medium">{c.instructor}</td>
                  <td className="py-3 px-4 text-center">
                    {c.isFree ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Miễn phí
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                        Trả phí • {formatVnd(c.price)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-foreground tabular-nums">
                    +{formatNumber(c.newEnrollments)} lượt
                  </td>
                  <td className="py-3 px-5 text-right font-semibold text-muted-foreground tabular-nums">
                    {formatNumber(c.totalOwned)} học viên
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-5 w-14 text-center">#</th>
                <th className="py-3 px-4">Tên khóa học</th>
                <th className="py-3 px-4 text-right">Tổng học viên đã bắt đầu học</th>
                <th className="py-3 px-4 text-right">Số học viên hoàn thành</th>
                <th className="py-3 px-5 w-56">Tỷ lệ hoàn thành (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {sortedCourses.map((c, idx) => (
                <tr key={c.id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-5 text-center font-bold text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-foreground">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">{c.instructor}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-muted-foreground tabular-nums">
                    {formatNumber(c.startedLearners)} học viên
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatNumber(c.completedLearners)} học viên
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${c.completionRate}%` }}
                        />
                      </div>
                      <span className="font-extrabold text-foreground w-12 text-right tabular-nums">
                        {c.completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
