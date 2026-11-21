// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseStatusEnum } from 'share-lib';
import { AdminCoursesView } from '../components/admin-courses-view';

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/courses',
  useSearchParams: () => navigation.searchParams,
  useRouter: () => ({ replace: navigation.replace }),
}));
vi.mock('@/components/shared/data-table', async () => ({
  ...await import('@/components/shared/data-table/hooks/use-data-table-url-state'),
  BaseDataTable: ({ emptyTitle }: { emptyTitle: string }) => <div data-table-title={emptyTitle} />,
}));
vi.mock('../api/admin-courses.api', () => ({
  useAdminCoursesQuery: () => ({
    data: { items: [], total: 0, totalPages: 1 },
    isLoading: false, isFetching: false, refetch: vi.fn(),
  }),
  useAdminCourseStatsQuery: () => ({
    data: { total: 0, published: 0, draft: 0, archived: 0, pendingApproval: 0 },
    isPending: false, isFetching: false, isError: false, refetch: vi.fn(),
  }),
  useAdminCourseApprovalHistoriesQuery: () => ({
    data: { items: [], total: 0, totalPages: 1 },
    isLoading: false, isFetching: false, refetch: vi.fn(),
  }),
  useAdminCourseApprovalHistoryStatsQuery: () => ({
    data: { total: 0, approved: 0, rejected: 0 },
    isFetching: false, refetch: vi.fn(),
  }),
}));
vi.mock('../components/admin-course-columns', () => ({ createAdminCourseColumns: () => [] }));
vi.mock('../components/admin-course-approval-history-columns', () => ({
  createAdminCourseApprovalHistoryColumns: () => [],
}));
vi.mock('../components/course-approval-dialog', () => ({ CourseApprovalDialog: () => null }));
vi.mock('../components/course-rejection-dialog', () => ({ CourseRejectionDialog: () => null }));
vi.mock('../components/course-approval-history-detail-dialog', () => ({
  CourseApprovalHistoryDetailDialog: () => null,
}));
vi.mock('../components/course-timeline-history-dialog', () => ({ CourseTimelineHistoryDialog: () => null }));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span aria-hidden="true" /> }));

describe('Admin courses tab navigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  function render() {
    act(() => root.render(<AdminCoursesView />));
  }

  function click(label: string) {
    const button = Array.from(container.querySelectorAll('button'))
      .find((node) => node.textContent?.trim() === label);
    expect(button).toBeDefined();
    act(() => button!.click());
    render();
  }

  function expectTable(title: string) {
    expect(container.querySelector('[data-table-title]')?.getAttribute('data-table-title')).toBe(title);
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    navigation.searchParams = new URLSearchParams();
    navigation.replace.mockImplementation((url: string) => {
      navigation.searchParams = new URL(url, 'http://localhost:3000').searchParams;
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([
    'tab=HISTORY&page=1',
    'tab=HISTORY&historyStatus=APPROVED&page=3',
    'tab=HISTORY&historyStatus=REJECTED&page=4',
  ])('returns from %s to courses with one URL update', (query) => {
    navigation.searchParams = new URLSearchParams(query);
    render();
    expectTable('Chưa có lịch sử phê duyệt');

    click('Danh sách khóa học');

    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/admin/courses?page=1', { scroll: false });
    expectTable('Không tìm thấy khóa học');

    click('Lịch sử phê duyệt');

    expect(navigation.searchParams.get('tab')).toBe('HISTORY');
    expect(navigation.searchParams.has('historyStatus')).toBe(false);
    expectTable('Chưa có lịch sử phê duyệt');
  });

  it('switches back and forth repeatedly without getting stuck in history', () => {
    render();
    expectTable('Không tìm thấy khóa học');

    for (let round = 0; round < 3; round++) {
      click('Lịch sử phê duyệt');
      expect(navigation.searchParams.get('tab')).toBe('HISTORY');
      expect(navigation.searchParams.get('page')).toBe('1');
      expectTable('Chưa có lịch sử phê duyệt');

      click('Danh sách khóa học');
      expect(navigation.searchParams.has('tab')).toBe(false);
      expectTable('Không tìm thấy khóa học');
    }

    expect(navigation.replace).toHaveBeenCalledTimes(6);
  });

  it('keeps search, sorting, page size and course status when leaving history', () => {
    navigation.searchParams = new URLSearchParams({
      tab: 'HISTORY',
      historyStatus: 'APPROVED',
      page: '5',
      limit: '20',
      search: 'React căn bản',
      sort: 'title:asc',
      status: CourseStatusEnum.PUBLISHED,
    });
    render();

    click('Danh sách khóa học');

    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(navigation.searchParams)).toEqual({
      page: '1',
      limit: '20',
      search: 'React căn bản',
      sort: 'title:asc',
      status: CourseStatusEnum.PUBLISHED,
    });
    expectTable('Không tìm thấy khóa học');
    expect(container.querySelector('input')?.value).toBe('React căn bản');
  });
});
