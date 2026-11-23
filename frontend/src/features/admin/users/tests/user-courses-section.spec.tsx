// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseLevelEnum, CourseStatusEnum, LearningStatusEnum, OrderStatusEnum, RoleEnum,
  type IAdminUserEnrolledCourse, type IAdminUserTeaching,
} from 'share-lib';
import { UserCoursesSection } from '../components/user-courses-section';

const { get, push } = vi.hoisted(() => ({ get: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { get } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/ui/icon', () => ({ Icon: () => React.createElement('span', { 'aria-hidden': true }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

const emptyTeaching: IAdminUserTeaching = {
  stats: { totalCourses: 0, totalStudents: 0, totalRevenue: 0, netRevenue: 0, averageRating: 0, totalReviews: 0 },
  courses: [],
};

function enrollment(title: string, overrides: Partial<IAdminUserEnrolledCourse> = {}): IAdminUserEnrolledCourse {
  return {
    id: title, courseId: title, title, thumbnailUrl: null, enrolledAt: '2026-10-12T00:00:00Z',
    paidAt: '2026-10-13T00:00:00Z', price: 150000, isFree: false, paymentStatus: OrderStatusEnum.PAID,
    totalLessons: 4, completedLessons: 0, progressPercent: 0, status: LearningStatusEnum.IN_PROGRESS,
    ...overrides,
  };
}

describe('Per-account course data on admin user details', () => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let data: Map<string, { enrolled: IAdminUserEnrolledCourse[]; teaching: IAdminUserTeaching }>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    get.mockReset();
    push.mockReset();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    data = new Map([
      ['account-a', { enrolled: [enrollment('Khóa riêng của A')], teaching: emptyTeaching }],
      ['account-b', { enrolled: [enrollment('Khóa riêng của B')], teaching: emptyTeaching }],
    ]);
    get.mockImplementation(async (url: string) => {
      const [, , userId, endpoint] = url.split('/');
      const account = data.get(userId)!;
      return { data: { data: endpoint === 'teaching' ? account.teaching : account.enrolled } };
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function render(userId = 'account-a', role = RoleEnum.STUDENT) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <UserCoursesSection key={userId} userId={userId} role={role} />
        </QueryClientProvider>,
      );
    });
    await act(async () => { await vi.runAllTimersAsync(); });
  }

  async function click(label: string) {
    const button = [...host.querySelectorAll('button')].find((node) => node.textContent?.trim().startsWith(label));
    expect(button).toBeDefined();
    await act(async () => { button!.click(); });
    await act(async () => { await vi.runAllTimersAsync(); });
  }

  it.each([RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN])('shows the selected %s account enrollment data', async (role) => {
    await render('account-a', role);
    if (role === RoleEnum.INSTRUCTOR) await click('Khóa học đã đăng ký');
    expect(host.textContent).toContain('Khóa riêng của A');
    expect(host.textContent).not.toContain('Khóa riêng của B');
    expect(host.textContent).toContain('150.000');
    expect(host.textContent).toContain('Đã thanh toán');
    expect(host.querySelector('img')).toBeNull();
    expect([...host.querySelectorAll('button')].find((node) => node.textContent?.includes('Gỡ quyền truy cập'))?.disabled).toBe(true);
  });

  it('changes data and resets filters when navigating to another account', async () => {
    await render();
    await click('Hoàn thành');
    expect(host.textContent).not.toContain('Khóa riêng của A');
    await render('account-b');
    expect(host.textContent).toContain('Khóa riêng của B');
    expect(host.textContent).not.toContain('Khóa riêng của A');
    expect(get).toHaveBeenCalledWith('/users/account-b/enrolled-courses', { signal: expect.any(AbortSignal) });
    expect(get).toHaveBeenCalledWith('/users/account-b/teaching', { signal: expect.any(AbortSignal) });
  });

  it('filters with server learning states, including an IN_PROGRESS learner at 0%', async () => {
    data.get('account-a')!.enrolled.push(
      enrollment('Chưa bắt đầu', { id: 'not-started', status: LearningStatusEnum.NOT_STARTED }),
      enrollment('Đã hoàn thành', { id: 'completed', status: LearningStatusEnum.COMPLETED, progressPercent: 100 }),
    );
    await render();
    await click('Đang học');
    expect(host.textContent).toContain('Khóa riêng của A');
    expect(host.textContent).toContain('0%');
    expect(host.textContent).not.toContain('Chưa bắt đầu');
    expect(host.textContent).not.toContain('Đã hoàn thành');
    await click('Hoàn thành');
    expect(host.textContent).toContain('Đã hoàn thành');
    expect(host.textContent).not.toContain('Khóa riêng của A');
  });

  it('shows real free/unknown-payment data and unknown progress without fictitious 100% or PAID labels', async () => {
    data.get('account-a')!.enrolled = [
      enrollment('Khóa miễn phí', { isFree: true, price: 0, paymentStatus: null, paidAt: null, totalLessons: 0, progressPercent: null }),
      enrollment('Thiếu đơn hàng', { price: null, paymentStatus: null, paidAt: null }),
    ];
    await render();
    expect(host.textContent).toContain('Đăng ký miễn phí');
    expect(host.textContent).toContain('Chưa có dữ liệu số tiền');
    expect(host.textContent).toContain('Chưa xác minh thanh toán');
    expect(host.textContent).toContain('Chưa có bài video để tính tiến độ');
    expect(host.textContent).not.toContain('Đã thanh toán');
    expect(host.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('displays loading and errors distinctly from a true empty account, and retries the real request', async () => {
    get.mockImplementation(() => new Promise(() => {}));
    await render();
    expect(host.textContent).toContain('Đang tải khóa học đã đăng ký');
    expect(host.textContent).not.toContain('0 khóa học');
    get.mockRejectedValue(new Error('Unavailable'));
    await render('account-b');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Tài khoản này chưa đăng ký');
    get.mockResolvedValue({ data: { data: [] } });
    // Retry the enrollment failure, not the independent teaching request.
    const alert = [...host.querySelectorAll('[role="alert"]')].find((node) => node.textContent?.includes('Không thể tải khóa học đã đăng ký'))!;
    await act(async () => { alert.querySelector<HTMLButtonElement>('button')!.click(); });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(host.textContent).toContain('Tài khoản này chưa đăng ký khóa học nào');
    expect(host.textContent).not.toContain('Khóa riêng của A');
  });

  it('renders database teaching KPIs, lowercase enums, archives, and the real details navigation', async () => {
    data.get('account-a')!.teaching = {
      stats: { totalCourses: 1, totalStudents: 2, totalRevenue: 250000, netRevenue: 200000, averageRating: 4.5, totalReviews: 2 },
      courses: [{
        id: 'stored-course-id', title: 'Khóa giảng dạy thật', thumbnailUrl: null, price: 900000,
        level: CourseLevelEnum.ALL_LEVELS, status: CourseStatusEnum.ARCHIVED, studentCount: 2,
        revenue: 250000, rating: 4.5, reviewCount: 2, updatedAt: '2026-10-01',
      }],
    };
    await render('account-a', RoleEnum.INSTRUCTOR);
    expect(host.textContent).toContain('250.000');
    expect(host.textContent).toContain('200.000');
    expect(host.textContent).toContain('4.5');
    expect(host.textContent).toContain('Mọi trình độ');
    await click('Ngừng bán');
    expect(host.textContent).toContain('Khóa giảng dạy thật');
    await click('Chi tiết');
    expect(push).toHaveBeenCalledWith('/courses/stored-course-id');
    await click('Khóa học đã đăng ký');
    expect(host.textContent).toContain('Khóa riêng của A');
    expect(host.textContent).not.toContain('Khóa giảng dạy thật');
  });

  it('preserves actual teaching history even when an account is now a student or admin', async () => {
    data.get('account-a')!.teaching = {
      ...emptyTeaching, stats: { ...emptyTeaching.stats, totalRevenue: 150000, netRevenue: 120000 },
    };
    await render('account-a', RoleEnum.STUDENT);
    expect(host.textContent).toContain('Tổng doanh thu tạo ra');
    expect(host.textContent).toContain('150.000');
    expect(host.textContent).toContain('120.000');
  });

  it('does not convert incomplete teaching finances into zero KPIs or block the learning tab', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/teaching')) throw { response: { status: 422, data: { message: 'Cần đối soát đơn hàng' } } };
      return { data: { data: [enrollment('Khóa học vẫn tải được')] } };
    });
    await render('account-a', RoleEnum.INSTRUCTOR);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Cần đối soát đơn hàng');
    expect(host.textContent).not.toContain('Tổng doanh thu tạo ra');
    await click('Khóa học đã đăng ký');
    expect(host.textContent).toContain('Khóa học vẫn tải được');
  });
});
