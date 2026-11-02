'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { RoleEnum } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { CourseManagementContent } from './course-management-content';
import { InstructorCourseAccess } from './instructor-course-access';

export function CourseLandingContent({ children }: { children: React.ReactNode }): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: user, isLoading } = useCurrentUserQuery();
  const searchParams = useSearchParams();
  const showCatalog = searchParams.get('view') === 'catalog' ||
    ['q', 'category', 'price', 'level', 'sort', 'page'].some((key) => searchParams.has(key));

  if (!isMounted || isLoading) {
    return <div role="status" className="px-4 py-16 text-center text-sm text-muted-foreground">Đang tải khóa học...</div>;
  }

  if (user?.role === RoleEnum.INSTRUCTOR && !showCatalog) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <InstructorCourseAccess>
          <CourseManagementContent />
        </InstructorCourseAccess>
      </main>
    );
  }

  return <>{children}</>;
}
