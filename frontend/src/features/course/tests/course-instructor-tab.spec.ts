// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import type { IPublicCourseCard } from '../types/public-course.types';
import {
  TeacherCourseRow,
  formatCompactNumber,
  formatCoursePrice,
} from '../components/public-detail/teacher-course-row';
import { CourseInstructorTab } from '../components/public-detail/course-instructor-tab';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) =>
    createElement('span', { 'data-icon': icon, className }),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) =>
    createElement('img', { src, alt, className }),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
  }) =>
    createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}));

// Mock API Query Hook
const mockUseInstructorPublicCoursesQuery = vi.fn();
vi.mock('../api/public-courses.api', () => ({
  useInstructorPublicCoursesQuery: (...args: unknown[]) =>
    mockUseInstructorPublicCoursesQuery(...args),
}));

const mockCourses: IPublicCourseCard[] = [
  {
    id: 'course-1',
    title: 'Introduction to Community Management',
    slug: 'introduction-to-community-management',
    description: 'Course 1 description',
    thumbnailUrl: 'https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800',
    price: 399000,
    originalPrice: 799000,
    instructorId: 'inst-1',
    instructorName: 'Ana Marin',
    instructorTitle: 'Expert',
    instructorAvatar: 'https://images.unsplash.com/avatar',
    rating: 4.8,
    reviewCount: 5100,
    studentCount: 179000,
    durationFormatted: '4 giờ 30 phút',
    lessonsCount: 18,
    categorySlug: 'management',
    categoryName: 'Quản trị',
    isFeatured: true,
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.BEGINNER,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
  },
  {
    id: 'course-2',
    title: 'Social Media Strategy: Design, Manage, and Launch Campaigns',
    slug: 'social-media-strategy',
    description: 'Course 2 description',
    thumbnailUrl: 'https://images.unsplash.com/photo-2?auto=format&fit=crop&w=800',
    price: 0,
    originalPrice: null,
    instructorId: 'inst-1',
    instructorName: 'Ana Marin',
    instructorTitle: 'Expert',
    instructorAvatar: 'https://images.unsplash.com/avatar',
    rating: 4.7,
    reviewCount: 290,
    studentCount: 26000,
    durationFormatted: '2 giờ 15 phút',
    lessonsCount: 10,
    categorySlug: 'marketing',
    categoryName: 'Marketing',
    isFeatured: false,
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.INTERMEDIATE,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: false,
      hasTranscript: true,
    },
  },
];

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockUseInstructorPublicCoursesQuery.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('Helper: formatCompactNumber', () => {
  it('formats values under 1K with standard string or 0', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(undefined)).toBe('0');
    expect(formatCompactNumber(null)).toBe('0');
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('formats values in thousands (K)', () => {
    expect(formatCompactNumber(1000)).toBe('1K');
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(26000)).toBe('26K');
    expect(formatCompactNumber(179000)).toBe('179K');
    expect(formatCompactNumber(5100)).toBe('5.1K');
  });

  it('formats values in millions (M)', () => {
    expect(formatCompactNumber(1000000)).toBe('1M');
    expect(formatCompactNumber(2500000)).toBe('2.5M');
  });
});

describe('Helper: formatCoursePrice', () => {
  it('returns "Miễn phí" for free courses (price = 0, null, or undefined)', () => {
    expect(formatCoursePrice(0)).toBe('Miễn phí');
    expect(formatCoursePrice(null)).toBe('Miễn phí');
    expect(formatCoursePrice(undefined)).toBe('Miễn phí');
  });

  it('formats price with VND currency sign', () => {
    expect(formatCoursePrice(250000)).toBe('250.000 đ');
    expect(formatCoursePrice(399000)).toBe('399.000 đ');
  });
});

describe('TeacherCourseRow Component', () => {
  it('renders title, BEST SELLER badge, teacher name, student count, stars, and price', () => {
    act(() => {
      root.render(
        createElement(TeacherCourseRow, {
          course: mockCourses[0],
          instructorName: 'Ana Marin',
        }),
      );
    });

    // Verify Title
    expect(container.textContent).toContain('Introduction to Community Management');

    // Verify BEST SELLER badge
    expect(container.textContent).toContain('BEST SELLER');

    // Verify Teacher credit
    expect(container.textContent).toContain('Khóa học bởi Ana Marin');

    // Verify Compact Student Count
    expect(container.textContent).toContain('179K');

    // Verify Rating and Reviews Count
    expect(container.textContent).toContain('4.8');
    expect(container.textContent).toContain('(5.1K)');

    // Verify Price
    expect(container.textContent).toContain('399.000 đ');
  });

  it('renders free course correctly without BEST SELLER if criteria not met', () => {
    const ordinaryCourse: IPublicCourseCard = {
      ...mockCourses[1],
      isFeatured: false,
      studentCount: 2,
      reviewCount: 0,
      rating: 0,
    };

    act(() => {
      root.render(
        createElement(TeacherCourseRow, {
          course: ordinaryCourse,
          instructorName: 'Ana Marin',
        }),
      );
    });

    expect(container.textContent).toContain('Social Media Strategy');
    expect(container.textContent).not.toContain('BEST SELLER');
    expect(container.textContent).toContain('Miễn phí');
  });
});

describe('CourseInstructorTab Component', () => {
  it('renders instructor profile and filters out currentCourseId from other courses list', () => {
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: {
        items: mockCourses,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
    });

    act(() => {
      root.render(
        createElement(CourseInstructorTab, {
          currentCourseId: 'course-1',
          instructor: {
            id: 'inst-1',
            fullName: 'Ana Marin',
            email: 'ana.marin@example.com',
            avatarUrl: null,
          },
          instructorId: 'inst-1',
        }),
      );
    });

    // Profile info
    expect(container.textContent).toContain('Ana Marin');
    expect(container.textContent).not.toContain('ana.marin@example.com');
    expect(container.textContent).toContain('Giảng viên chuyên gia được xác thực');

    // Other courses section header
    expect(container.textContent).toContain('Khóa học khác của giảng viên này');

    // course-1 was filtered out because currentCourseId is 'course-1'
    const otherCourseRows = container.querySelectorAll('[data-ui="teacher-course-row"]');
    expect(otherCourseRows.length).toBe(1);
    expect(container.textContent).toContain('Social Media Strategy');
    expect(container.textContent).not.toContain('Introduction to Community Management');
    expect(container.textContent).toContain('205.000');
    expect(container.textContent).not.toContain('96%');
  });

  it('renders empty state when instructor has no other courses', () => {
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: {
        items: [mockCourses[0]],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
    });

    act(() => {
      root.render(
        createElement(CourseInstructorTab, {
          currentCourseId: 'course-1',
          instructor: {
            id: 'inst-1',
            fullName: 'Ana Marin',
            email: 'ana.marin@example.com',
          },
          instructorId: 'inst-1',
        }),
      );
    });

    expect(container.textContent).toContain('Chưa có thêm khóa học nào khác');
    const otherCourseRows = container.querySelectorAll('[data-ui="teacher-course-row"]');
    expect(otherCourseRows.length).toBe(0);
  });

  it('displays real zero enrollments and no invented rating or completion percentage', () => {
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: { items: [], total: 0 }, isLoading: false, isError: false,
    });
    act(() => root.render(createElement(CourseInstructorTab, { instructorId: 'inst-1' })));

    const label = [...container.querySelectorAll('span')].find((node) => node.textContent === 'Lượt ghi danh');
    expect(label?.parentElement?.querySelector('p')?.textContent).toBe('0');
    expect(container.textContent).toContain('0 khóa');
    expect(container.textContent).toContain('Chưa có đánh giá');
    expect(container.textContent).not.toMatch(/15\.4K|96%|4\.9 \/|5\.0 \//);
  });

  it('does not show fake or stale stats/empty state on API failure, and supports retry', () => {
    const refetch = vi.fn();
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: { items: mockCourses, total: 2 }, isLoading: false, isError: true, refetch,
    });
    act(() => root.render(createElement(CourseInstructorTab, { instructorId: 'inst-1' })));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Không thể tải danh sách khóa học');
    expect(container.querySelectorAll('[data-ui="teacher-course-row"]')).toHaveLength(0);
    expect(container.textContent).not.toContain('205.000');
    expect(container.textContent).not.toContain('Chưa có thêm khóa học nào khác');
    act(() => container.querySelector<HTMLButtonElement>('[role="alert"] button')?.click());
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows unknown totals while loading instead of fabricated student numbers', () => {
    mockUseInstructorPublicCoursesQuery.mockReturnValue({ isLoading: true, isError: false });
    act(() => root.render(createElement(CourseInstructorTab, { instructorId: 'inst-1' })));
    expect(container.textContent).toContain('—');
    expect(container.textContent).not.toContain('15.4K');
  });
});
