// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseApprovalActionEnum, CourseStatusEnum, type ICourseApprovalHistory } from 'share-lib';
import { adminCoursesApi, adminCoursesKeys } from '../api/admin-courses.api';
import { createAdminCourseApprovalHistoryColumns } from '../components/admin-course-approval-history-columns';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: mocks }));
vi.mock('next/link', () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span aria-hidden="true" /> }));
vi.mock('@/components/shared/data-table', () => ({ DataTableColumnHeader: () => null }));

describe('Admin course approval history API and Columns', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onViewDetail = vi.fn();
  const onViewCourseTimeline = vi.fn();

  const mockHistoryItem: ICourseApprovalHistory = {
    id: 'hist-1',
    courseId: 'course-1',
    adminId: 'admin-1',
    instructorId: 'inst-1',
    action: CourseApprovalActionEnum.REJECTED,
    previousStatus: CourseStatusEnum.PENDING_APPROVAL,
    targetStatus: CourseStatusEnum.DRAFT,
    reason: 'Video bài giảng thiếu âm thanh ở phút thứ 2',
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    course: {
      id: 'course-1',
      title: 'Khóa học TypeScript Chuyên sâu',
      slug: 'khoa-hoc-typescript-chuyen-sau',
      thumbnailUrl: null,
      category: { id: 'cat-1', name: 'Lập trình' },
    },
    admin: {
      id: 'admin-1',
      fullName: 'Quản trị viên 1',
      email: 'admin1@example.com',
      avatarUrl: null,
    },
    instructor: {
      id: 'inst-1',
      fullName: 'Giảng viên A',
      email: 'instructor@example.com',
      avatarUrl: null,
    },
  };

  function TableHarness({ items }: { items: ICourseApprovalHistory[] }) {
    const table = useReactTable({
      data: items,
      columns: createAdminCourseApprovalHistoryColumns({
        onViewDetail,
        onViewCourseTimeline,
      }),
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <table>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id} data-col={cell.column.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('queries approval histories from API endpoint', async () => {
    const mockData = { items: [mockHistoryItem], total: 1, page: 1, limit: 10, totalPages: 1 };
    mocks.get.mockResolvedValue({ data: { success: true, data: mockData } });

    const result = await adminCoursesApi.getApprovalHistories({ page: 1, limit: 10, action: CourseApprovalActionEnum.REJECTED });
    expect(result).toEqual(mockData);
    expect(mocks.get).toHaveBeenCalledWith(
      '/courses/admin/approval-history',
      expect.objectContaining({
        params: expect.objectContaining({ page: 1, limit: 10, action: 'REJECTED' }),
      }),
    );
    expect(adminCoursesKeys.approvalHistories({ page: 1 })).toEqual([
      'admin-courses',
      'approval-histories',
      { page: 1 },
    ]);
  });

  it('queries approval history stats from API endpoint', async () => {
    const stats = { total: 5, approved: 3, rejected: 2 };
    mocks.get.mockResolvedValue({ data: { success: true, data: stats } });

    const result = await adminCoursesApi.getApprovalHistoryStats();
    expect(result).toEqual(stats);
    expect(mocks.get).toHaveBeenCalledWith('/courses/admin/approval-history/stats');
  });

  it('queries history for a specific course from API endpoint', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, data: [mockHistoryItem] } });

    const result = await adminCoursesApi.getCourseApprovalHistory('course-1');
    expect(result).toEqual([mockHistoryItem]);
    expect(mocks.get).toHaveBeenCalledWith('/courses/course-1/approval-history');
  });

  it('renders history table row with rejection details and triggers onViewDetail', () => {
    act(() => {
      root.render(<TableHarness items={[mockHistoryItem]} />);
    });

    expect(container.textContent).toContain('Khóa học TypeScript Chuyên sâu');
    expect(container.textContent).toContain('Giảng viên A');
    expect(container.textContent).toContain('Đã từ chối');
    expect(container.textContent).toContain('Quản trị viên 1');
    expect(container.textContent).toContain('Video bài giảng thiếu âm thanh ở phút thứ 2');

    const detailBtn = container.querySelector('button[title*="Xem chi tiết"]');
    expect(detailBtn).not.toBeNull();
    act(() => {
      detailBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onViewDetail).toHaveBeenCalledWith(mockHistoryItem);
  });

  it('renders history table row with approved status', () => {
    const approvedItem: ICourseApprovalHistory = {
      ...mockHistoryItem,
      id: 'hist-2',
      action: CourseApprovalActionEnum.APPROVED,
      targetStatus: CourseStatusEnum.PUBLISHED,
      reason: null,
    };

    act(() => {
      root.render(<TableHarness items={[approvedItem]} />);
    });

    expect(container.textContent).toContain('Đã phê duyệt');
    expect(container.textContent).toContain('Đạt tiêu chuẩn xuất bản');
  });
});
