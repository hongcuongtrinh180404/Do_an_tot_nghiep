// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseStatusEnum, type IAdminCourseStats } from 'share-lib';
import { AdminCoursesView } from '../components/admin-courses-view';

const mocks = vi.hoisted(() => ({
  listQuery: vi.fn(),
  statsQuery: vi.fn(),
  urlState: vi.fn(),
  setFilter: vi.fn(),
  refetchList: vi.fn(),
  refetchStats: vi.fn(),
}));

vi.mock('../api/admin-courses.api', () => ({
  useAdminCoursesQuery: mocks.listQuery,
  useAdminCourseStatsQuery: mocks.statsQuery,
  useAdminCourseApprovalHistoriesQuery: vi.fn().mockReturnValue({
    data: { items: [], total: 0, totalPages: 1 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useAdminCourseApprovalHistoryStatsQuery: vi.fn().mockReturnValue({
    data: { total: 0, approved: 0, rejected: 0 },
    isFetching: false,
  }),
  useCourseApprovalHistoryQuery: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/shared/data-table', () => ({
  useDataTableUrlState: mocks.urlState,
  BaseDataTable: ({ totalItems }: { totalItems: number }) => <div data-table-total={totalItems} />,
}));
vi.mock('../components/admin-course-columns', () => ({ createAdminCourseColumns: () => [] }));
vi.mock('../components/course-approval-dialog', () => ({ CourseApprovalDialog: () => null }));
vi.mock('../components/course-rejection-dialog', () => ({ CourseRejectionDialog: () => null }));
vi.mock('../components/course-approval-history-detail-dialog', () => ({ CourseApprovalHistoryDetailDialog: () => null }));
vi.mock('../components/course-timeline-history-dialog', () => ({ CourseTimelineHistoryDialog: () => null }));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span aria-hidden="true" /> }));

const stats: IAdminCourseStats = {
  total: 1234, published: 1200, draft: 20, archived: 10, pendingApproval: 4,
};

describe('Admin course statistics cards', () => {
  let container: HTMLDivElement;
  let root: Root;

  function setRoute(status = 'ALL', searchValue = '', page = 1) {
    mocks.urlState.mockReturnValue({
      page, limit: 10, searchValue,
      setSearchValue: vi.fn(), setPage: vi.fn(), setLimit: vi.fn(),
      setFilter: mocks.setFilter,
      getFilter: () => status === 'ALL' ? [] : [status],
      resetFilters: vi.fn(), sorting: [], setSorting: vi.fn(), sortParam: 'createdAt:desc',
    });
  }

  function render() {
    act(() => root.render(<AdminCoursesView />));
  }

  function values() {
    return Array.from(container.querySelectorAll('[data-stat-value]'), (node) => node.textContent);
  }

  function click(node: Element | null) {
    expect(node).not.toBeNull();
    act(() => (node as HTMLButtonElement).click());
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    setRoute();
    mocks.listQuery.mockReturnValue({
      data: { items: [], total: 1234, totalPages: 124 },
      isLoading: false, isFetching: false, refetch: mocks.refetchList,
    });
    mocks.statsQuery.mockReturnValue({
      data: stats, isPending: false, isFetching: false, isError: false, refetch: mocks.refetchStats,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows all five real counts immediately, with consistent archived and pending labels', () => {
    render();
    expect(values()).toEqual(['1.234', '1.200', '20', '10', '4']);
    expect(container.querySelectorAll('[data-stat]')).toHaveLength(5);
    expect(container.querySelector('[data-stat="archived"]')?.textContent).toContain('Ngưng bán');
    expect(container.querySelector('[data-stat="pendingApproval"]')?.textContent).toContain('Chờ duyệt');
    expect(container.textContent).toContain('4 chờ duyệt');
    expect(container.textContent).not.toContain('Đang hoạt động');
    expect(container.textContent).not.toContain('Chỉnh sửa');
    expect(container.textContent).not.toContain('Lưu trữ');
    expect(mocks.statsQuery).toHaveBeenCalledWith();
    expect(mocks.listQuery).toHaveBeenCalledTimes(1);
  });

  it.each(Object.values(CourseStatusEnum))('keeps global counts when filtering status %s', (status) => {
    setRoute(status);
    mocks.listQuery.mockReturnValue({
      data: { items: [], total: 2, totalPages: 1 },
      isLoading: false, isFetching: false, refetch: mocks.refetchList,
    });
    render();

    expect(values()).toEqual(['1.234', '1.200', '20', '10', '4']);
    expect(container.querySelector('[data-table-total]')?.getAttribute('data-table-total')).toBe('2');
    expect(mocks.listQuery).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });

  it('keeps global counts when searching, paging or showing no table results', () => {
    setRoute('ALL', 'không tìm thấy', 3);
    mocks.listQuery.mockReturnValue({
      data: { items: [], total: 0, totalPages: 1 },
      isLoading: false, isFetching: false, refetch: mocks.refetchList,
    });
    render();

    expect(values()).toEqual(['1.234', '1.200', '20', '10', '4']);
    expect(mocks.listQuery).toHaveBeenCalledWith(expect.objectContaining({
      page: 3, search: 'không tìm thấy', status: undefined,
    }));
    expect(container.querySelector('[data-table-total]')?.getAttribute('data-table-total')).toBe('0');
  });

  it.each([
    ['published', CourseStatusEnum.PUBLISHED],
    ['draft', CourseStatusEnum.DRAFT],
    ['archived', CourseStatusEnum.ARCHIVED],
    ['pendingApproval', CourseStatusEnum.PENDING_APPROVAL],
    ['total', undefined],
  ])('uses the %s card as a native button to filter the table', (key, status) => {
    render();
    const button = container.querySelector(`[data-stat="${key}"] button`);
    expect(button?.tagName).toBe('BUTTON');
    click(button);
    expect(mocks.setFilter).toHaveBeenCalledWith('status', status ? [status] : []);
  });

  it('shows real zeros, not placeholders, when no courses exist', () => {
    mocks.statsQuery.mockReturnValue({
      data: { total: 0, published: 0, draft: 0, archived: 0, pendingApproval: 0 },
      isPending: false, isFetching: false, isError: false, refetch: mocks.refetchStats,
    });
    render();
    expect(values()).toEqual(['0', '0', '0', '0', '0']);
    expect(container.textContent).not.toContain('chờ duyệt');
  });

  it('keeps the card layout with loading indicators instead of invented zero counts', () => {
    mocks.statsQuery.mockReturnValue({
      data: undefined, isPending: true, isFetching: true, isError: false, refetch: mocks.refetchStats,
    });
    render();
    expect(container.querySelectorAll('[aria-label="Đang tải số liệu"]')).toHaveLength(5);
    expect(values()).toEqual(['', '', '', '', '']);
  });

  it('shows missing values and a retry action when statistics fail', () => {
    mocks.statsQuery.mockReturnValue({
      data: undefined, isPending: false, isFetching: false, isError: true, refetch: mocks.refetchStats,
    });
    render();
    expect(values()).toEqual(['—', '—', '—', '—', '—']);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Không tải được thống kê');
    click(container.querySelector('[role="alert"] button'));
    expect(mocks.refetchStats).toHaveBeenCalledTimes(1);
  });

  it('retains cached counts and warns when a refresh fails', () => {
    mocks.statsQuery.mockReturnValue({
      data: stats, isPending: false, isFetching: false, isError: true, refetch: mocks.refetchStats,
    });
    render();
    expect(values()).toEqual(['1.234', '1.200', '20', '10', '4']);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('có thể chưa mới nhất');
  });

  it('refreshes both the table and the global statistics', () => {
    render();
    click(Array.from(container.querySelectorAll('button')).find((node) => node.textContent === 'Làm mới') ?? null);
    expect(mocks.refetchList).toHaveBeenCalledTimes(1);
    expect(mocks.refetchStats).toHaveBeenCalledTimes(1);
  });

  it('disables refresh while either request is fetching', () => {
    mocks.statsQuery.mockReturnValue({
      data: stats, isPending: false, isFetching: true, isError: false, refetch: mocks.refetchStats,
    });
    render();
    const refresh = Array.from(container.querySelectorAll('button')).find((node) => node.textContent === 'Làm mới');
    expect(refresh?.disabled).toBe(true);
    expect(values()).toEqual(['1.234', '1.200', '20', '10', '4']);
  });
});
