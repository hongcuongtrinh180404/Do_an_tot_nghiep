'use client';

import React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { useMyCoursesQuery } from '../api/course.api';
import { CourseHeader } from './course-header';
import { CourseEmptyState } from './course-empty-state';
import { CourseCard } from './course-card';
import { CourseListSkeleton } from './course-card-skeleton';

export function CourseManagementContent(): React.JSX.Element {
  const { data: courses, isLoading, isError, refetch } = useMyCoursesQuery();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <CourseHeader />

      {isLoading ? (
        <CourseListSkeleton />
      ) : isError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon icon="lucide:alert-circle" className="size-5 shrink-0 text-destructive" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">
                  Không thể tải danh sách khóa học
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Đã xảy ra lỗi khi tải dữ liệu từ máy chủ. Vui lòng thử lại sau.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Icon icon="lucide:refresh-cw" className="size-3.5 mr-1.5" />
              Thử lại
            </button>
          </div>
        </Card>
      ) : !courses || courses.length === 0 ? (
        <CourseEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
