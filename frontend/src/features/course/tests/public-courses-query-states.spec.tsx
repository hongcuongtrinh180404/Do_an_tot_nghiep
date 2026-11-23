// @vitest-environment jsdom
import React, { act, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import { FeaturedCourses } from '../components/public-discovery/featured-courses';
import { RecentCourses } from '../components/public-discovery/recent-courses';
import { NewsHighlightsCarousel } from '../components/public-discovery/news-highlights-carousel';
import { CourseCatalogView } from '../components/catalog/course-catalog-view';
import { InstructorProfileDialog } from '../components/instructor/instructor-profile-dialog';
import MyCoursesPage from '@/app/my-courses/page';
import { mapCourseToPublicCard } from '../services/public-courses.service';

const { query, instructorQuery, purchasedQuery } = vi.hoisted(() => ({
  query: vi.fn(), instructorQuery: vi.fn(), purchasedQuery: vi.fn(),
}));
vi.mock('../api/public-courses.api', () => ({
  usePublicCoursesCatalogQuery: query,
  useInstructorPublicCoursesQuery: instructorQuery,
}));
vi.mock('../api/enrollment.api', () => ({ useMyPurchasedCoursesQuery: purchasedQuery }));
vi.mock('../api/learning-progress.api', () => ({ useMyLearningProgressQuery: () => ({ data: [] }) }));
vi.mock('@/features/auth/api/auth.api', () => ({
  useCurrentUserQuery: () => ({ data: { id: 'student' }, isLoading: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/courses',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span /> }));
vi.mock('../components/public-discovery', () => ({
  PublicHeader: () => null, PublicFooter: () => null,
}));
vi.mock('../components/public-discovery/course-card', () => ({
  CourseCard: ({ course }: { course: { title: string; studentCount: number } }) =>
    <article>{course.title}: {course.studentCount} học viên</article>,
}));
vi.mock('../components/catalog/course-catalog-filters', () => ({ CourseCatalogFilters: () => null }));
vi.mock('../components/catalog/course-catalog-sort', () => ({ CourseCatalogSort: () => null }));
vi.mock('../components/catalog/course-catalog-active-chips', () => ({ CourseCatalogActiveChips: () => null }));
vi.mock('@/components/ui/dialog', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
    DialogContent: Wrapper, DialogHeader: Wrapper, DialogTitle: Wrapper, DialogDescription: Wrapper,
  };
});

const components = [
  ['featured', () => <FeaturedCourses />],
  ['recent', () => <RecentCourses selectedCategorySlug="all" onClearFilters={() => undefined} />],
  ['highlights', () => <NewsHighlightsCarousel />],
  ['catalog', () => <CourseCatalogView />],
  ['instructor dialog', () => <InstructorProfileDialog isOpen onClose={() => undefined} instructor={{
    id: 'teacher', fullName: 'Giảng viên', email: '',
  }} />],
  ['purchased courses', () => <MyCoursesPage />],
] as const;

const realCourse = {
  id: 'database-course', title: 'Khóa học từ API', slug: 'api-course', price: 0,
  instructorId: 'teacher', status: CourseStatusEnum.PUBLISHED, level: CourseLevelEnum.BEGINNER,
  studentsCount: 1, createdAt: '2026-11-23', updatedAt: '2026-11-23',
};

beforeEach(() => {
  const state = { isLoading: false, isError: false, data: { items: [], total: 0 }, refetch: vi.fn() };
  query.mockReturnValue(state);
  instructorQuery.mockReturnValue(state);
  purchasedQuery.mockReturnValue({ ...state, data: [] });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('no frontend course fallback on API failure', () => {
  it.each(components)('%s shows an actionable error, not empty/mock/stale course data', (_name, component) => {
    const refetch = vi.fn();
    const state = {
      isLoading: false, isError: true, refetch,
      data: { items: [mapCourseToPublicCard(realCourse)], total: 1, page: 1, limit: 12, totalPages: 1 },
    };
    query.mockReturnValue(state);
    instructorQuery.mockReturnValue(state);
    purchasedQuery.mockReturnValue({ ...state, data: [realCourse] });
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      act(() => root.render(component()));
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('Không thể tải danh sách khóa học');
      expect(container.textContent).not.toContain(realCourse.title);
      expect(container.textContent).not.toContain('Không tìm thấy khóa học phù hợp');
      expect(container.textContent).not.toContain('Chưa có khóa học nào');
      act(() => container.querySelector<HTMLButtonElement>('[role="alert"] button')?.click());
      expect(refetch).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });

  it('highlights use backend course IDs/titles instead of a static mock carousel', () => {
    query.mockReturnValue({
      data: { items: [mapCourseToPublicCard(realCourse)], total: 1 }, isLoading: false, isError: false,
    });
    const html = renderToStaticMarkup(<NewsHighlightsCarousel />);
    expect(html).toContain(realCourse.title);
    expect(html).toContain(`/courses/${realCourse.id}`);
    expect(html).not.toContain('Ceramic Wheel');
    expect(html).not.toContain('Domestika');
  });

  it('purchased-course cards use the backend enrollment count', () => {
    purchasedQuery.mockReturnValue({ data: [realCourse], isLoading: false, isError: false });
    expect(renderToStaticMarkup(<MyCoursesPage />)).toContain('1 học viên');
  });
});
