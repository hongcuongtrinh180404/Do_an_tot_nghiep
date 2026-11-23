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

// Mock API Query Hooks
const mockUseInstructorPublicCoursesQuery = vi.fn();
const mockUseRelatedCategoryCoursesQuery = vi.fn();
vi.mock('../api/public-courses.api', () => ({
  useInstructorPublicCoursesQuery: (...args: unknown[]) =>
    mockUseInstructorPublicCoursesQuery(...args),
  useRelatedCategoryCoursesQuery: (...args: unknown[]) =>
    mockUseRelatedCategoryCoursesQuery(...args),
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
  mockUseRelatedCategoryCoursesQuery.mockReset();
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
  beforeEach(() => {
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseRelatedCategoryCoursesQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 6, totalPages: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('renders instructor profile and shows related courses from the current category', () => {
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: {
        items: mockCourses,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    mockUseRelatedCategoryCoursesQuery.mockReturnValue({
      data: {
        items: mockCourses,
        total: 2,
        page: 1,
        limit: 6,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
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
          categorySlug: 'management',
          categoryName: 'Quản trị',
        }),
      );
    });

    // Profile info
    expect(container.textContent).toContain('Ana Marin');
    expect(container.textContent).not.toContain('ana.marin@example.com');
    expect(container.textContent).toContain('Giảng viên chuyên gia được xác thực');

    // Related courses section header
    expect(container.textContent).toContain('Khóa học liên quan');
    expect(container.textContent).toContain('Cùng danh mục:');
    expect(container.textContent).toContain('Quản trị');
    expect(container.textContent).not.toContain('Khóa học khác của giảng viên này');

    // course-1 was filtered out because currentCourseId is 'course-1'
    const relatedCourseRows = container.querySelectorAll('[data-ui="teacher-course-row"]');
    expect(relatedCourseRows.length).toBe(1);
    expect(container.textContent).toContain('Social Media Strategy');
    expect(container.textContent).not.toContain('Introduction to Community Management');
    expect(container.textContent).toContain('205.000');
    expect(container.textContent).not.toContain('96%');
  });

  it('renders empty state when the category has no other courses', () => {
    mockUseRelatedCategoryCoursesQuery.mockReturnValue({
      data: {
        items: [mockCourses[0]],
        total: 1,
        page: 1,
        limit: 6,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
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
          categorySlug: 'management',
          categoryName: 'Quản trị',
        }),
      );
    });

    expect(container.textContent).toContain('Chưa có khóa học nào khác trong danh mục này');
    const relatedCourseRows = container.querySelectorAll('[data-ui="teacher-course-row"]');
    expect(relatedCourseRows.length).toBe(0);
    expect(container.textContent).not.toContain('Xem thêm');
  });

  it('shows at most 5 related courses and a Xem thêm link with the category filter', () => {
    const categoryCourses = Array.from({ length: 6 }, (_, index) => ({
      ...mockCourses[1],
      id: `related-${index}`,
      title: `Related Course ${index}`,
      studentCount: 10,
    }));

    mockUseRelatedCategoryCoursesQuery.mockReturnValue({
      data: {
        items: categoryCourses,
        total: 7,
        page: 1,
        limit: 6,
        totalPages: 2,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    act(() => {
      root.render(
        createElement(CourseInstructorTab, {
          currentCourseId: 'course-1',
          instructor: { id: 'inst-1', fullName: 'Ana Marin', email: '' },
          instructorId: 'inst-1',
          categorySlug: 'management',
          categoryName: 'Quản trị',
        }),
      );
    });

    const relatedCourseRows = container.querySelectorAll('[data-ui="teacher-course-row"]');
    expect(relatedCourseRows.length).toBe(5);
    expect(container.textContent).toContain('Related Course 0');
    expect(container.textContent).toContain('Related Course 4');
    expect(container.textContent).not.toContain('Related Course 5');

    const viewMoreLink = [...container.querySelectorAll('a')].find(
      (link) => link.textContent?.includes('Xem thêm'),
    );
    expect(viewMoreLink?.getAttribute('href')).toBe('/courses?category=management');
  });

  it('does not show the Xem thêm link when exactly 5 other courses remain', () => {
    const categoryCourses = Array.from({ length: 5 }, (_, index) => ({
      ...mockCourses[1],
      id: `related-${index}`,
      title: `Related Course ${index}`,
      studentCount: 10,
    }));

    mockUseRelatedCategoryCoursesQuery.mockReturnValue({
      data: {
        items: [mockCourses[0], ...categoryCourses],
        total: 6,
        page: 1,
        limit: 6,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    act(() => {
      root.render(
        createElement(CourseInstructorTab, {
          currentCourseId: 'course-1',
          instructor: { id: 'inst-1', fullName: 'Ana Marin', email: '' },
          instructorId: 'inst-1',
          categorySlug: 'management',
          categoryName: 'Quản trị',
        }),
      );
    });

    expect(container.querySelectorAll('[data-ui="teacher-course-row"]')).toHaveLength(5);
    expect(container.textContent).not.toContain('Xem thêm');
  });

  it('hides the related courses section when the course has no category', () => {
    act(() => {
      root.render(
        createElement(CourseInstructorTab, {
          currentCourseId: 'course-1',
          instructor: { id: 'inst-1', fullName: 'Ana Marin', email: '' },
          instructorId: 'inst-1',
        }),
      );
    });

    expect(container.textContent).toContain('Ana Marin');
    expect(container.textContent).not.toContain('Khóa học liên quan');
    expect(container.querySelectorAll('[data-ui="teacher-course-row"]')).toHaveLength(0);
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

  it('does not show fake or stale stats/related courses on API failure, and supports retry', () => {
    const refetch = vi.fn();
    mockUseInstructorPublicCoursesQuery.mockReturnValue({
      data: { items: mockCourses, total: 2 }, isLoading: false, isError: true,
    });
    mockUseRelatedCategoryCoursesQuery.mockReturnValue({
      data: { items: mockCourses, total: 2 },
      isLoading: false,
      isError: true,
      refetch,
    });
    act(() => root.render(createElement(CourseInstructorTab, {
      instructorId: 'inst-1',
      categorySlug: 'management',
      categoryName: 'Quản trị',
    })));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Không thể tải danh sách khóa học');
    expect(container.querySelectorAll('[data-ui="teacher-course-row"]')).toHaveLength(0);
    expect(container.textContent).not.toContain('205.000');
    expect(container.textContent).not.toContain('Chưa có khóa học nào khác trong danh mục này');
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
