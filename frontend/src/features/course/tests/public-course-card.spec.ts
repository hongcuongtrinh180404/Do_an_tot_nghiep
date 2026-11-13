import { describe, it, expect } from 'vitest';
import { RoleEnum, CourseLevelEnum, CourseStatusEnum, type ICourse } from 'share-lib';
import { canManageCourse } from '../utils/course-access.util';
import { formatCourseDuration, mapCourseToPublicCard } from '../services/public-courses.service';

/**
 * Pure function helper reproducing the CTA decision matrix of CourseCard
 */
export function determineCourseCardCta(params: {
  price: number;
  isEnrolled: boolean;
  resumeLessonId?: string | null;
  isInProgress?: boolean;
}): { label: string; icon: string; showPrice: boolean } {
  if (params.isEnrolled) {
    const isContinuing = Boolean(params.resumeLessonId || params.isInProgress);
    return {
      label: isContinuing ? 'Tiếp tục học' : 'Vào học',
      icon: 'lucide:play-circle',
      showPrice: false,
    };
  }

  if (params.price === 0) {
    return {
      label: 'Đăng ký miễn phí',
      icon: 'lucide:shopping-cart',
      showPrice: true,
    };
  }

  return {
    label: 'Mua ngay',
    icon: 'lucide:shopping-cart',
    showPrice: true,
  };
}

describe('Public Course Card Data Mapping and Pricing Rules', () => {
  it('correctly calculates 80% discount when originalPrice is 10000 and price is 2000', () => {
    const originalPrice = 10000;
    const price = 2000;
    const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);
    const discountPercent = hasDiscount
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

    expect(hasDiscount).toBe(true);
    expect(discountPercent).toBe(80);
  });

  it('hides discount when originalPrice is equal or less than price', () => {
    const originalPrice = 2000;
    const price = 2000;
    const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);
    const discountPercent = hasDiscount
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

    expect(hasDiscount).toBe(false);
    expect(discountPercent).toBe(null);
  });

  it('hides discount when course is free (price = 0)', () => {
    const originalPrice = 100000;
    const price = 0;
    const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);

    expect(hasDiscount).toBe(false);
  });

  it('evaluates best seller condition: true when studentsCount >= 5 or ratingAvg >= 4.5 with reviews', () => {
    const courseHighStudents: Pick<ICourse, 'studentsCount' | 'ratingAvg' | 'reviewCount'> = {
      studentsCount: 6,
      ratingAvg: 0,
      reviewCount: 0,
    };
    const isBestSeller1 =
      (courseHighStudents.studentsCount ?? 0) >= 5 ||
      ((courseHighStudents.reviewCount ?? 0) > 0 && (courseHighStudents.ratingAvg ?? 0) >= 4.5);
    expect(isBestSeller1).toBe(true);

    const courseHighRating: Pick<ICourse, 'studentsCount' | 'ratingAvg' | 'reviewCount'> = {
      studentsCount: 1,
      ratingAvg: 4.8,
      reviewCount: 12,
    };
    const isBestSeller2 =
      (courseHighRating.studentsCount ?? 0) >= 5 ||
      ((courseHighRating.reviewCount ?? 0) > 0 && (courseHighRating.ratingAvg ?? 0) >= 4.5);
    expect(isBestSeller2).toBe(true);

    const courseNew: Pick<ICourse, 'studentsCount' | 'ratingAvg' | 'reviewCount'> = {
      studentsCount: 1,
      ratingAvg: 0,
      reviewCount: 0,
    };
    const isBestSeller3 =
      (courseNew.studentsCount ?? 0) >= 5 ||
      ((courseNew.reviewCount ?? 0) > 0 && (courseNew.ratingAvg ?? 0) >= 4.5);
    expect(isBestSeller3).toBe(false);
  });
});

describe('Course Card CTA Action Button Ownership Rules', () => {
  it('displays "Mua ngay" with price tag for unowned paid courses', () => {
    const cta = determineCourseCardCta({ price: 299000, isEnrolled: false });
    expect(cta.label).toBe('Mua ngay');
    expect(cta.icon).toBe('lucide:shopping-cart');
    expect(cta.showPrice).toBe(true);
  });

  it('displays "Đăng ký miễn phí" with free price tag for unowned free courses (price = 0)', () => {
    const cta = determineCourseCardCta({ price: 0, isEnrolled: false });
    expect(cta.label).toBe('Đăng ký miễn phí');
    expect(cta.icon).toBe('lucide:shopping-cart');
    expect(cta.showPrice).toBe(true);
  });

  it('displays "Vào học" without price tag when user has purchased paid course', () => {
    const cta = determineCourseCardCta({ price: 500000, isEnrolled: true });
    expect(cta.label).toBe('Vào học');
    expect(cta.icon).toBe('lucide:play-circle');
    expect(cta.showPrice).toBe(false);
  });

  it('displays "Tiếp tục học" when user has in-progress lesson or status', () => {
    const ctaWithLesson = determineCourseCardCta({
      price: 500000,
      isEnrolled: true,
      resumeLessonId: 'lesson-123',
    });
    expect(ctaWithLesson.label).toBe('Tiếp tục học');
    expect(ctaWithLesson.icon).toBe('lucide:play-circle');

    const ctaInProgress = determineCourseCardCta({
      price: 500000,
      isEnrolled: true,
      isInProgress: true,
    });
    expect(ctaInProgress.label).toBe('Tiếp tục học');
  });

  it('displays "Vào học" without price tag when user has registered free course', () => {
    const cta = determineCourseCardCta({ price: 0, isEnrolled: true });
    expect(cta.label).toBe('Vào học');
    expect(cta.icon).toBe('lucide:play-circle');
    expect(cta.showPrice).toBe(false);
  });

  it('correctly resolves ownership from bulk enrolledCourseIds Set in O(1)', () => {
    const enrolledIds = new Set(['course-1', 'course-3', 'course-5']);

    expect(enrolledIds.has('course-1')).toBe(true);
    expect(enrolledIds.has('course-2')).toBe(false);
    expect(enrolledIds.has('course-3')).toBe(true);
    expect(enrolledIds.has('course-4')).toBe(false);
    expect(enrolledIds.has('course-5')).toBe(true);
  });

  it('recognizes instructor as owner of their created course', () => {
    const instructorUser = { id: 'inst-123', role: RoleEnum.INSTRUCTOR };
    const ownCourse = { id: 'c-1', instructorId: 'inst-123' };
    const otherCourse = { id: 'c-2', instructorId: 'inst-999' };

    expect(canManageCourse(instructorUser, ownCourse)).toBe(true);
    expect(canManageCourse(instructorUser, otherCourse)).toBe(false);
  });
});

describe('Course Duration Formatting and Public Card Mapping', () => {
  it('formats course duration in hours and minutes', () => {
    expect(formatCourseDuration(4560, 5)).toBe('1h 16p');
    expect(formatCourseDuration(3600, 3)).toBe('1 giờ');
    expect(formatCourseDuration(120, 2)).toBe('2 phút');
    expect(formatCourseDuration(45, 1)).toBe('45 giây');
    expect(formatCourseDuration(0, 10)).toBe('10 bài học');
    expect(formatCourseDuration(0, 0)).toBe('Nhiều bài học');
  });

  it('maps ICourse to IPublicCourseCard properly with fallback duration from progress', () => {
    const mockCourse: ICourse = {
      id: 'c-test-1',
      title: 'Khóa học Next.js',
      slug: 'khoa-hoc-next-js',
      price: 299000,
      instructorId: 'inst-1',
      status: CourseStatusEnum.PUBLISHED,
      level: CourseLevelEnum.INTERMEDIATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: {
        id: 'cat-1',
        name: 'Công nghệ thông tin',
        slug: 'cong-nghe-thong-tin',
      },
      instructor: {
        id: 'inst-1',
        fullName: 'Trịnh Hồng Cường',
        email: 'cuong@example.com',
      },
    };

    // 4560000 ms = 4560s = 1h 16m
    const mapped = mapCourseToPublicCard(mockCourse, 4560000);
    expect(mapped.categoryName).toBe('Công nghệ thông tin');
    expect(mapped.instructorName).toBe('Trịnh Hồng Cường');
    expect(mapped.durationFormatted).toBe('1h 16p');
  });
});
