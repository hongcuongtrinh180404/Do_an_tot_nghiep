'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  MOCK_ENROLLED_COURSES,
  type EnrolledCourseItem,
} from '../constants/mock-enrolled-courses';
import { UserEnrolledCourseCard } from './user-enrolled-course-card';

type FilterTab = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_STARTED';

interface TabOption {
  key: FilterTab;
  label: string;
  icon: string;
}

const FILTER_TABS: TabOption[] = [
  { key: 'ALL', label: 'Tất cả', icon: 'lucide:layout-grid' },
  { key: 'IN_PROGRESS', label: 'Đang học', icon: 'lucide:play-circle' },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'lucide:trophy' },
  { key: 'NOT_STARTED', label: 'Chưa học', icon: 'lucide:clock-3' },
];

export function UserEnrolledCoursesSection(): React.JSX.Element {
  const [courses] = React.useState<EnrolledCourseItem[]>(MOCK_ENROLLED_COURSES);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<FilterTab>('ALL');

  // Đếm số lượng theo từng trạng thái để hiển thị trên tab badge
  const counts = React.useMemo(() => {
    return {
      ALL: courses.length,
      IN_PROGRESS: courses.filter((c) => c.progressPercent > 0 && c.progressPercent < 100).length,
      COMPLETED: courses.filter((c) => c.progressPercent === 100).length,
      NOT_STARTED: courses.filter((c) => c.progressPercent === 0).length,
    };
  }, [courses]);

  // Lọc danh sách theo tab và thanh tìm kiếm
  const filteredCourses = React.useMemo(() => {
    return courses.filter((course) => {
      // Lọc theo từ khóa tìm kiếm (không phân biệt hoa thường)
      const matchesSearch = course.title
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

      if (!matchesSearch) return false;

      // Lọc theo Tab trạng thái
      if (activeTab === 'IN_PROGRESS') {
        return course.progressPercent > 0 && course.progressPercent < 100;
      }
      if (activeTab === 'COMPLETED') {
        return course.progressPercent === 100;
      }
      if (activeTab === 'NOT_STARTED') {
        return course.progressPercent === 0;
      }

      return true;
    });
  }, [courses, searchQuery, activeTab]);

  return (
    <section className="bg-card text-card-foreground border border-border/60 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0">
            <Icon icon="lucide:graduation-cap" className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Khóa Học Đã Đăng Ký
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/80">
                {courses.length} khóa học
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Theo dõi tiến độ học tập, trạng thái kích hoạt và quản lý quyền truy cập bài giảng của học viên.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: Tìm kiếm & Bộ Lọc Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Bộ lọc tabs pill buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
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
                  {counts[tab.key]}
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
            placeholder="Tìm theo tên khóa học..."
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

      {/* Danh Sách Thẻ Khóa Học */}
      {filteredCourses.length > 0 ? (
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <UserEnrolledCourseCard key={course.id} course={course} />
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
                : 'Chưa có khóa học nào thuộc phân loại trạng thái này.'}
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
  );
}
