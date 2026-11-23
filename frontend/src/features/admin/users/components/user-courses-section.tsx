'use client';

import { RoleEnum } from 'share-lib';
import { useAdminUserEnrolledCoursesQuery, useAdminUserTeachingQuery } from '../api/users-admin.api';
import { InstructorCoursesSection } from './instructor-courses-section';
import { UserEnrolledCoursesSection } from './user-enrolled-courses-section';
import { UserCoursesError } from './user-courses-query-state';

export function UserCoursesSection({ userId, role }: { userId: string; role: RoleEnum }) {
  const enrolledQuery = useAdminUserEnrolledCoursesQuery(userId);
  const teachingQuery = useAdminUserTeachingQuery(userId);
  const stats = teachingQuery.data?.stats;
  // Preserve teaching history for admins/accounts whose role has changed, too.
  const hasTeaching = role === RoleEnum.INSTRUCTOR
    || (stats && (stats.totalCourses > 0 || stats.totalRevenue > 0));

  if (hasTeaching) {
    return <InstructorCoursesSection teachingQuery={teachingQuery} enrolledQuery={enrolledQuery} />;
  }

  return (
    <div className="space-y-6">
      {teachingQuery.isError && (
        <UserCoursesError
          title="Không thể tải số liệu giảng dạy"
          error={teachingQuery.error}
          onRetry={() => { void teachingQuery.refetch(); }}
        />
      )}
      <UserEnrolledCoursesSection query={enrolledQuery} />
    </div>
  );
}
