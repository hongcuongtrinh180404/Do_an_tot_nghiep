// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeachingStatsView } from '../components/teaching-stats-view';
import { formatVnd } from '@/features/admin/revenue/utils/revenue-format.util';

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  courses: vi.fn(),
  refetchOverview: vi.fn(),
  refetchCourses: vi.fn(),
}));
vi.mock('../api/teaching-stats.api', () => ({
  useTeachingOverviewQuery: mocks.overview,
  useCoursesRevenueQuery: mocks.courses,
  useInstructorReviewStatsQuery: () => ({ data: undefined, isLoading: false }),
  useInstructorReviewsQuery: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('@/features/course/api/course.api', () => ({
  useMyCoursesQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/components/ui/icon', () => ({
  Icon: () => <span aria-hidden="true" />,
}));
vi.mock('../components/teaching-review-stats-section', () => ({
  TeachingReviewStatsSection: () => <div data-testid="review-stats">Thống kê đánh giá</div>,
}));
vi.mock('../components/teaching-recent-reviews-section', () => ({
  TeachingRecentReviewsSection: () => <div data-testid="recent-reviews">Đánh giá gần đây</div>,
}));

const overviewData = {
  totalRevenue: 200000, instructorEarnings: 140000, successfulSales: 1, averageRating: 4.5, totalReviews: 2,
};
const coursesData = {
  items: [{
    id: 'course-1', title: 'Khóa học kiểm thử', status: 'PUBLISHED', price: 200000,
    successfulSales: 1, totalRevenue: 200000, instructorEarnings: 140000,
  }],
  total: 1, page: 1, limit: 10, totalPages: 1,
};
const dataError = new AxiosError('Incomplete data', 'ERR_BAD_RESPONSE', undefined, undefined, {
  status: 422, statusText: '', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  data: {
    code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE', reason: 'missing_payment_date',
    message: 'Có đơn hàng thiếu ngày thanh toán đã xác thực. Vui lòng liên hệ quản trị viên để đối soát.',
  },
});

describe('Teaching statistics', () => {
  let host: HTMLDivElement;
  let root: Root;

  function query(data: unknown, refetch: () => void, isError = false, isFetching = false) {
    return { data, isLoading: false, isError, error: isError ? dataError : null, isFetching, refetch };
  }

  function render() {
    act(() => root.render(<TeachingStatsView />));
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    mocks.overview.mockReturnValue(query(overviewData, mocks.refetchOverview));
    mocks.courses.mockReturnValue(query(coursesData, mocks.refetchCourses));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it('defaults both revenue reports to today on first render', () => {
    render();
    expect(host.querySelector('[role="combobox"]')?.textContent).toBe('Hôm nay');
    expect(mocks.overview).toHaveBeenNthCalledWith(1, {
      timeRange: 'today',
      startDate: undefined,
      endDate: undefined,
    });
    expect(mocks.courses).toHaveBeenNthCalledWith(1, {
      timeRange: 'today',
      startDate: undefined,
      endDate: undefined,
      search: '',
      sort: 'revenue_desc',
      page: 1,
      limit: 10,
    });
  });

  it('shows data errors instead of zero revenue or a misleading empty-course message', () => {
    mocks.overview.mockReturnValue(query(undefined, mocks.refetchOverview, true));
    mocks.courses.mockReturnValue(query(undefined, mocks.refetchCourses, true));
    render();
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(2);
    expect(host.textContent).toContain('thiếu ngày thanh toán đã xác thực');
    expect(host.textContent).not.toContain(formatVnd(0));
    expect(host.textContent).not.toContain('Không tìm thấy khóa học nào');
    expect(host.textContent).toContain('Tổng cộng: — khóa học');
    expect(host.querySelector('#section-courses-revenue')?.textContent).toBe('Doanh thu theo khóa học');
    expect(host.querySelector('table')).toBeNull();
    expect(host.querySelector('input[placeholder="Tìm theo tên khóa học..."]')).not.toBeNull();
    expect(host.querySelector('[data-testid="review-stats"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="recent-reviews"]')).not.toBeNull();
  });

  it('retries only the section whose retry button was clicked', () => {
    mocks.overview.mockReturnValue(query(undefined, mocks.refetchOverview, true));
    mocks.courses.mockReturnValue(query(undefined, mocks.refetchCourses, true));
    render();
    const buttons = host.querySelectorAll<HTMLButtonElement>('[role="alert"] button');
    act(() => buttons[0].click());
    expect(mocks.refetchOverview).toHaveBeenCalledTimes(1);
    expect(mocks.refetchCourses).not.toHaveBeenCalled();
    act(() => buttons[1].click());
    expect(mocks.refetchCourses).toHaveBeenCalledTimes(1);
  });

  it('disables retry while the section is already refetching', () => {
    mocks.overview.mockReturnValue(query(undefined, mocks.refetchOverview, true, true));
    mocks.courses.mockReturnValue(query(undefined, mocks.refetchCourses, true, true));
    render();
    for (const button of host.querySelectorAll<HTMLButtonElement>('[role="alert"] button')) {
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('Đang thử lại...');
      act(() => button.click());
    }
    expect(mocks.refetchOverview).not.toHaveBeenCalled();
    expect(mocks.refetchCourses).not.toHaveBeenCalled();
  });

  it('keeps successful overview and reviews when only the course report fails', () => {
    mocks.courses.mockReturnValue(query(undefined, mocks.refetchCourses, true));
    render();
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(host.textContent).toContain('200.000');
    expect(host.textContent).toContain('Không thể tải doanh thu khóa học');
    expect(host.querySelector('[data-testid="recent-reviews"]')).not.toBeNull();
  });

  it('keeps successful course rows when only the overview fails', () => {
    mocks.overview.mockReturnValue(query(undefined, mocks.refetchOverview, true));
    render();
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(host.textContent).toContain('Khóa học kiểm thử');
    expect(host.textContent).toContain('Tổng cộng: 1 khóa học');
  });

  it('does not present cached financial figures as valid after an incomplete-data error', () => {
    mocks.overview.mockReturnValue(query(overviewData, mocks.refetchOverview, true));
    mocks.courses.mockReturnValue(query({ ...coursesData, totalPages: 2 }, mocks.refetchCourses, true));
    render();
    expect(host.textContent).not.toContain('200.000');
    expect(host.textContent).not.toContain('Khóa học kiểm thử');
    expect(host.textContent).not.toContain('Hiển thị trang');
  });

  it('still shows genuine zero totals and empty results after a successful response', () => {
    mocks.overview.mockReturnValue(query({
      totalRevenue: 0, instructorEarnings: 0, successfulSales: 0, averageRating: 0, totalReviews: 0,
    }, mocks.refetchOverview));
    mocks.courses.mockReturnValue(query({ items: [], total: 0, page: 1, limit: 10, totalPages: 1 }, mocks.refetchCourses));
    render();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain(formatVnd(0));
    expect(host.textContent).toContain('Tổng cộng: 0 khóa học');
    expect(host.textContent).toContain('Không tìm thấy khóa học nào');
  });
});
