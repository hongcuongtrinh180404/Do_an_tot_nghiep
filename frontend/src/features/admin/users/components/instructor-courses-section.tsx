'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  MOCK_INSTRUCTOR_STATS,
  MOCK_INSTRUCTOR_COURSES,
  type InstructorTeachingCourse,
  type TeachingCourseStatus,
} from '../constants/mock-instructor-data';
import { MOCK_ENROLLED_COURSES } from '../constants/mock-enrolled-courses';
import { InstructorStatsOverview } from './instructor-stats-overview';
import { InstructorTeachingCard } from './instructor-teaching-card';
import { UserEnrolledCoursesSection } from './user-enrolled-courses-section';

type InstructorTab = 'TEACHING' | 'ENROLLED';
type StatusFilter = 'ALL' | TeachingCourseStatus;

interface StatusFilterOption {
  key: StatusFilter;
  label: string;
  icon: string;
}

const STATUS_FILTERS: StatusFilterOption[] = [
  { key: 'ALL', label: 'Tất cả', icon: 'lucide:layout-grid' },
  { key: 'PUBLISHED', label: 'Đã xuất bản', icon: 'lucide:check-circle-2' },
  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', icon: 'lucide:hourglass' },
  { key: 'DRAFT', label: 'Bản nháp', icon: 'lucide:file-edit' },
];

export function InstructorCoursesSection(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<InstructorTab>('TEACHING');
  const [teachingCourses] = React.useState<InstructorTeachingCourse[]>(MOCK_INSTRUCTOR_COURSES);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');

  // Đếm số lượng theo trạng thái xuất bản
  const statusCounts = React.useMemo(() => {
    return {
      ALL: teachingCourses.length,
      PUBLISHED: teachingCourses.filter((c) => c.status === 'PUBLISHED').length,
      PENDING_APPROVAL: teachingCourses.filter((c) => c.status === 'PENDING_APPROVAL').length,
      DRAFT: teachingCourses.filter((c) => c.status === 'DRAFT').length,
    };
  }, [teachingCourses]);

  // Lọc khóa học giảng dạy theo từ khóa và trạng thái
  const filteredTeachingCourses = React.useMemo(() => {
    return teachingCourses.filter((course) => {
      const matchesSearch = course.title
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL' && course.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [teachingCourses, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Khối 4 Thẻ KPI Tóm Tắt Nhanh */}
      <InstructorStatsOverview stats={MOCK_INSTRUCTOR_STATS} />

      {/* 2. Thanh Chuyển Tab (Segmented Tabs Navigation) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 shadow-inner">
          {/* Tab 1: Khóa học giảng dạy */}
          <button
            type="button"
            onClick={() => setActiveTab('TEACHING')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'TEACHING'
                ? 'bg-background text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon icon="lucide:presentation" className="size-4" />
            <span>Khóa học giảng dạy</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === 'TEACHING'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {teachingCourses.length}
            </span>
          </button>

          {/* Tab 2: Khóa học đã mua */}
          <button
            type="button"
            onClick={() => setActiveTab('ENROLLED')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ENROLLED'
                ? 'bg-background text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon icon="lucide:book-check" className="size-4" />
            <span>Khóa học đã mua</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === 'ENROLLED'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {MOCK_ENROLLED_COURSES.length}
            </span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {activeTab === 'TEACHING'
            ? 'Quản lý các khóa học do giảng viên biên soạn và phân phối trên nền tảng.'
            : 'Theo dõi tiến độ học tập các khóa học mà tài khoản này đã đăng ký mua.'}
        </p>
      </div>

      {/* 3. Nội Dung Tab Tương Ứng */}
      {activeTab === 'TEACHING' ? (
        /* Nội dung Tab Khóa học giảng dạy */
        <section className="bg-card text-card-foreground border border-border/60 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center ring-1 ring-sky-500/20 shrink-0">
                <Icon icon="lucide:presentation" className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    Khóa Học Giảng Dạy Đã Tạo
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/80">
                    {teachingCourses.length} khóa
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Danh sách toàn bộ khóa học do giảng viên trực tiếp giảng dạy và xuất bản nội dung.
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar: Tìm kiếm & Lọc trạng thái xuất bản */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Bộ lọc tabs pill buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50">
              {STATUS_FILTERS.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-background text-foreground shadow-xs border border-border/60 font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Icon icon={tab.icon} className="size-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {statusCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ô Tìm Kiếm Nhanh */}
            <div className="relative w-full sm:w-64">
              <Icon
                icon="lucide:search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khóa học giảng dạy..."
                className="pl-8 text-xs h-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Xóa tìm kiếm"
                >
                  <Icon icon="lucide:x" className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Danh Sách Thẻ Khóa Học Giảng Dạy */}
          {filteredTeachingCourses.length > 0 ? (
            <div className="space-y-3">
              {filteredTeachingCourses.map((course) => (
                <InstructorTeachingCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            /* Empty State khi không tìm thấy kết quả */
            <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Icon icon="lucide:book-x" className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Không tìm thấy khóa học nào
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {searchQuery
                    ? `Không có kết quả khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác.`
                    : 'Chưa có khóa học nào thuộc trạng thái này.'}
                </p>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Icon icon="lucide:rotate-ccw" className="size-3" />
                  Đặt lại tìm kiếm
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        /* Nội dung Tab Khóa học đã mua */
        <UserEnrolledCoursesSection />
      )}
    </div>
  );
}
