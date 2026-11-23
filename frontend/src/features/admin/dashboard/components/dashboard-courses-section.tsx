'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { DashboardPeriodType, IDashboardCoursePerformance } from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import { formatNumber } from '../constants/mock-dashboard-data';

type CourseTabType = 'revenue' | 'enrollment' | 'completion';

interface DashboardCoursesSectionProps {
  globalPeriod: DashboardPeriodType;
  courses?: IDashboardCoursePerformance[];
  isLoading?: boolean;
}

interface CourseItemCellProps {
  course: IDashboardCoursePerformance;
  subText?: string;
}

function CourseItemCell({ course, subText }: CourseItemCellProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-[340px]">
      {course.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.thumbnailUrl}
          alt={course.title}
          className="size-10 rounded-lg object-cover border border-border/60 shrink-0 bg-muted"
        />
      ) : (
        <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
          <Icon icon="lucide:book-open" className="size-5" />
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span
          className="font-semibold text-foreground text-xs sm:text-sm truncate leading-snug"
          title={course.title}
        >
          {course.title}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          {subText ?? (course.slug ? `/${course.slug}` : '—')}
        </span>
      </div>
    </div>
  );
}

export function DashboardCoursesSection({
  globalPeriod,
  courses = [],
  isLoading = false,
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

  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [courses]);

  const availableInstructors = React.useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.instructor) set.add(c.instructor);
    });
    return Array.from(set);
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    return courses.filter((course) => {
      if (categoryFilter !== 'all' && course.category !== categoryFilter) return false;
      if (instructorFilter !== 'all' && course.instructor !== instructorFilter) return false;
      return true;
    });
  }, [courses, categoryFilter, instructorFilter]);

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
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'revenue'
                ? 'bg-card text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
            >
              Top 10 Doanh thu cao nhất
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('enrollment')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'enrollment'
                ? 'bg-card text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
            >
              Top 10 Nhiều lượt đăng ký nhất
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'completion'
                ? 'bg-card text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
            >
              Top 10 Tỷ lệ hoàn thành cao nhất
            </button>
          </div>
        </div>

        {/* Sub-Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period */}
            <div className="w-52 shrink-0">
              <Select<string>
                value={periodOverride}
                onValueChange={(val) => {
                  if (val) setPeriodOverride(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background">
                  <span className="truncate">
                    {periodOverride === 'today'
                      ? 'Hôm nay'
                      : periodOverride === '7d'
                        ? '7 ngày gần nhất'
                        : periodOverride === 'this_month'
                          ? 'Tháng này'
                          : periodOverride === 'this_year'
                            ? 'Năm nay'
                            : 'Thời gian: Theo Dashboard'}
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-52">
                  <SelectItem value="default" className="text-xs">Thời gian: Theo Dashboard</SelectItem>
                  <SelectItem value="today" className="text-xs">Hôm nay</SelectItem>
                  <SelectItem value="7d" className="text-xs">7 ngày gần nhất</SelectItem>
                  <SelectItem value="this_month" className="text-xs">Tháng này</SelectItem>
                  <SelectItem value="this_year" className="text-xs">Năm nay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="w-48 shrink-0">
              <Select<string>
                value={categoryFilter}
                onValueChange={(val) => {
                  if (val) setCategoryFilter(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background">
                  <span className="truncate">
                    {categoryFilter === 'all' ? 'Danh mục: Tất cả' : `Danh mục: ${categoryFilter}`}
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-48">
                  <SelectItem value="all" className="text-xs">Danh mục: Tất cả</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instructor */}
            <div className="w-48 shrink-0">
              <Select<string>
                value={instructorFilter}
                onValueChange={(val) => {
                  if (val) setInstructorFilter(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background">
                  <span className="truncate">
                    {instructorFilter === 'all' ? 'Giảng viên: Tất cả' : `Giảng viên: ${instructorFilter}`}
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-48">
                  <SelectItem value="all" className="text-xs">Giảng viên: Tất cả</SelectItem>
                  {availableInstructors.map((inst) => (
                    <SelectItem key={inst} value={inst} className="text-xs">
                      {inst}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset */}
            {isModified && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Icon icon="lucide:rotate-ccw" className="size-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-xl border border-border/60">
            <Icon icon="lucide:info" className="size-3 text-primary shrink-0" />
            <span>{ruleNote}</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[220px]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Đang tải dữ liệu hiệu suất khóa học...
          </div>
        ) : sortedCourses.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
            <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
              <Icon icon="lucide:book-open" className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              Chưa có dữ liệu hiệu suất khóa học nào trong khoảng thời gian này
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Dữ liệu sẽ tự động xuất hiện khi có học viên ghi danh hoặc hoàn thành khóa học.
            </p>
          </div>
        ) : activeTab === 'revenue' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-5 w-14 text-center">#</th>
                <th className="py-3 px-4">Tên khóa học</th>
                <th className="py-3 px-4">Giảng viên</th>
                <th className="py-3 px-4 text-right">Giá bán</th>
                <th className="py-3 px-4 text-right">Lượt bán kỳ lọc</th>
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
                    <CourseItemCell course={c} />
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-medium">{c.instructor}</td>
                  <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                    {formatVnd(c.price)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
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
                  <td className="py-3 px-4">
                    <CourseItemCell course={c} />
                  </td>
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
                    <CourseItemCell
                      course={c}
                      subText={
                        c.instructor
                          ? `${c.instructor}${c.slug ? ` • /${c.slug}` : ''}`
                          : (c.slug ? `/${c.slug}` : undefined)
                      }
                    />
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
