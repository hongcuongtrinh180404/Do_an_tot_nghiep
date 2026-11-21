// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum, RoleEnum } from 'share-lib';
import { type IPublicCourseDetailResponse } from '../api/enrollment.api';
import { PublicCourseDetailView } from '../components/public-detail/public-course-detail-view';

const mocks = vi.hoisted(() => ({
  user: vi.fn(), course: vi.fn(), enrollment: vi.fn(), learning: vi.fn(),
  freeEnroll: vi.fn(), createOrder: vi.fn(), mindmap: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span aria-hidden="true" /> }));
vi.mock('@/features/auth/api/auth.api', () => ({ useCurrentUserQuery: mocks.user }));
vi.mock('@/features/payment/api/payment.api', () => ({
  useCreateOrderMutation: () => ({ mutate: mocks.createOrder, isPending: false }),
}));
vi.mock('../api/enrollment.api', () => ({
  usePublicCourseDetailQuery: mocks.course,
  useCheckEnrollmentQuery: mocks.enrollment,
  useRegisterFreeCourseMutation: () => ({ mutate: mocks.freeEnroll, isPending: false }),
}));
vi.mock('../api/learning-progress.api', () => ({ useCourseLearningProgressQuery: mocks.learning }));
vi.mock('../components/public-detail/course-detail-header', () => ({
  CourseDetailHeader: () => <h1>Khoa học trong nấu ăn</h1>,
}));
vi.mock('../components/public-detail/course-intro-media', () => ({ CourseIntroMedia: () => null }));
vi.mock('../components/public-detail/course-info-tab', () => ({ CourseInfoTab: () => null }));
vi.mock('../components/public-detail/course-reviews-tab', () => ({ CourseReviewsTab: () => null }));
vi.mock('../components/public-detail/course-instructor-tab', () => ({ CourseInstructorTab: () => null }));
vi.mock('../components/public-detail/course-mindmap-tab', () => ({
  CourseMindmapTab: (props: unknown) => { mocks.mindmap(props); return null; },
}));

const course: IPublicCourseDetailResponse = {
  id: 'course-1', instructorId: 'owner', title: 'Khoa học trong nấu ăn',
  slug: 'khoa-hoc-trong-nau-an', price: 200000, status: CourseStatusEnum.PUBLISHED,
  level: CourseLevelEnum.BEGINNER, createdAt: '2026-11-01', updatedAt: '2026-11-01',
  sections: [{
    id: 'section-1', courseId: 'course-1', title: 'Protein', order: 0,
    createdAt: '2026-11-01', updatedAt: '2026-11-01',
    lessons: [
      { id: 'lesson-1', title: 'Học thử', order: 0, duration: 60, isPreview: true },
      { id: 'lesson-2', title: 'Bài giảng đầy đủ', order: 1, duration: 120, isPreview: false },
    ],
  }],
};

describe('Admin course preview uses the learner experience', () => {
  let container: HTMLDivElement;
  let root: Root;

  function render(role?: RoleEnum, id = 'viewer') {
    mocks.user.mockReturnValue({ data: role ? { id, role } : undefined });
    act(() => root.render(<PublicCourseDetailView courseId={course.id} />));
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    mocks.course.mockReturnValue({ data: course, isLoading: false, isError: false });
    mocks.enrollment.mockReturnValue({ data: false, isLoading: false });
    mocks.learning.mockReturnValue({ data: null, isLoading: false, isError: false });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each(Object.values(CourseStatusEnum))('renders %s for admins without edit or purchase controls', (status) => {
    mocks.course.mockReturnValue({ data: { ...course, status }, isLoading: false, isError: false });
    render(RoleEnum.ADMIN);

    expect(container.querySelector('[data-ui="admin-course-preview"]')?.textContent).toContain('Nội dung chỉ đọc');
    expect(container.querySelector('a[href="/admin/courses"]')).not.toBeNull();
    expect(container.querySelector('a[href*="mode=edit"]')).toBeNull();
    expect(container.querySelector('[data-ui="instructor-alert"]')).toBeNull();
    expect(container.querySelector('a[href="/courses/course-1/lessons/lesson-2"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Khóa học do bạn giảng dạy');
    expect(container.textContent).not.toContain('Bạn đã ghi danh');
    expect(container.textContent).not.toContain('Mua ngay');
    expect(mocks.enrollment).toHaveBeenCalledWith(course.id, false);
    expect(mocks.learning).toHaveBeenCalledWith('viewer', course.id, false);
    expect(mocks.freeEnroll).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('passes separate read-only admin access to the course mindmap', () => {
    render(RoleEnum.ADMIN);
    act(() => container.querySelector<HTMLButtonElement>('#tab-mindmap')!.click());
    expect(mocks.mindmap).toHaveBeenCalledWith(expect.objectContaining({
      isAdminPreview: true, isInstructorOwner: false, isEnrolled: false,
    }));
  });

  it('does not show enrollment progress even if an admin has cached enrollment data', () => {
    mocks.enrollment.mockReturnValue({ data: true, isLoading: false });
    render(RoleEnum.ADMIN);
    expect(mocks.learning).toHaveBeenCalledWith('viewer', course.id, false);
    expect(container.querySelector('[data-ui="admin-preview-access"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Bạn đã sở hữu khóa học này');
  });

  it('keeps management shortcuts for the instructor who owns the course', () => {
    render(RoleEnum.INSTRUCTOR, 'owner');
    expect(container.querySelector('[data-ui="admin-course-preview"]')).toBeNull();
    expect(container.querySelector('[data-ui="instructor-alert"]')).not.toBeNull();
    expect(container.querySelectorAll('a[href="/courses/course-1?mode=edit"]')).toHaveLength(2);
    expect(container.querySelector('a[href="/courses/course-1/lessons/lesson-2"]')).not.toBeNull();
    expect(container.textContent).toContain('Khóa học do bạn giảng dạy');
  });

  it.each([undefined, RoleEnum.STUDENT, RoleEnum.INSTRUCTOR])(
    'does not unlock paid lessons or editor controls for an unregistered %s',
    (role) => {
      render(role);
      expect(container.querySelector('[data-ui="admin-course-preview"]')).toBeNull();
      expect(container.querySelector('a[href*="mode=edit"]')).toBeNull();
      expect(container.querySelector('a[href="/courses/course-1/lessons/lesson-1"]')).not.toBeNull();
      expect(container.querySelector('a[href="/courses/course-1/lessons/lesson-2"]')).toBeNull();
      expect(container.textContent).toContain(role ? 'Mua ngay' : 'Đăng nhập để mua');
    },
  );

  it('keeps full lesson access for an enrolled student', () => {
    mocks.enrollment.mockReturnValue({ data: true, isLoading: false });
    render(RoleEnum.STUDENT);
    expect(container.querySelector('a[href="/courses/course-1/lessons/lesson-2"]')).not.toBeNull();
    expect(container.querySelector('a[href*="mode=edit"]')).toBeNull();
    expect(mocks.learning).toHaveBeenCalledWith('viewer', course.id, true);
    expect(container.textContent).toContain('Bạn đã sở hữu khóa học này');
  });
});
