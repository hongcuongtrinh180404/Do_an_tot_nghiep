'use client';

import { useMemo } from 'react';
import type { ICourse } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useMyPurchasedCoursesQuery } from '../api/enrollment.api';
import { canManageCourse } from '../utils/course-access.util';

export interface UseUserCourseOwnershipResult {
  /** Cho biết học viên đã đăng nhập tài khoản hay chưa */
  isLoggedIn: boolean;
  /** Đang trong quá trình tải thông tin tài khoản hoặc danh sách sở hữu */
  isCheckingOwnership: boolean;
  /** Danh sách ID khóa học học viên đã sở hữu (mua thành công hoặc đăng ký miễn phí) */
  enrolledCourseIds: Set<string>;
  /** Hàm kiểm tra nhanh một khóa học cụ thể đã được sở hữu hay chưa */
  isCourseOwned: (
    course: Pick<ICourse, 'id'> & Partial<Pick<ICourse, 'instructorId' | 'instructor'>>,
  ) => boolean;
}

/**
 * Hook tập trung quản lý và kiểm tra quyền sở hữu khóa học của học viên.
 *
 * Tối ưu hóa hiệu năng:
 * - Dùng chung 1 query duy nhất `['enrollments', 'my-courses']` được cache bởi React Query.
 * - Triệt tiêu hoàn toàn vấn đề N+1 requests khi có nhiều Course Card cùng render trên trang.
 * - Khách vãng lai (không có token trong localStorage) trả về false ngay lập tức mà không có độ trễ hay giật giao diện.
 */
export function useUserCourseOwnership(): UseUserCourseOwnershipResult {
  const { data: user, isLoading: isAuthLoading } = useCurrentUserQuery();
  const isLoggedIn = Boolean(user);

  // Chỉ gọi API bulk lấy danh sách khóa học khi học viên đã đăng nhập
  const { data: myCourses, isLoading: isEnrollmentLoading } =
    useMyPurchasedCoursesQuery(isLoggedIn);

  // Nhận diện token để biết phiên làm việc có tiềm năng đăng nhập hay là khách vãng lai
  const hasToken =
    typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'));

  // Đang xác thực nếu có token mà auth query chưa hoàn thành hoặc my-courses query đang chạy
  const isCheckingOwnership =
    hasToken && (isAuthLoading || (isLoggedIn && isEnrollmentLoading));

  // Tập hợp Set ID các khóa học đã sở hữu để tra cứu O(1)
  const enrolledCourseIds = useMemo(() => {
    if (!myCourses || !Array.isArray(myCourses)) return new Set<string>();
    return new Set(myCourses.map((c) => c.id));
  }, [myCourses]);

  const isCourseOwned = useMemo(() => {
    return (
      course: Pick<ICourse, 'id'> &
        Partial<Pick<ICourse, 'instructorId' | 'instructor'>>,
    ): boolean => {
      if (!isLoggedIn || !user) return false;

      // 1. Học viên đã sở hữu khóa học qua Enrollment (mua trả phí hoặc đăng ký miễn phí)
      if (enrolledCourseIds.has(course.id)) {
        return true;
      }

      // 2. Người dùng là Giảng viên sở hữu / tác giả tạo nên khóa học đó
      if (canManageCourse(user, course)) {
        return true;
      }

      return false;
    };
  }, [isLoggedIn, user, enrolledCourseIds]);

  return {
    isLoggedIn,
    isCheckingOwnership,
    enrolledCourseIds,
    isCourseOwned,
  };
}

