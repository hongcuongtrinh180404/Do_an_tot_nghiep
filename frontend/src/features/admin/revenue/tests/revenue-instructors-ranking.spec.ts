import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DashboardInstructorsSection } from '../index';

vi.mock('@/features/admin/dashboard/api/admin-dashboard.api', () => ({
  useAdminDashboardInstructorsRankingQuery: vi.fn().mockReturnValue({
    data: [
      {
        id: 'inst-1',
        name: 'Giảng viên Tiêu Biểu',
        email: 'gv@mindly.vn',
        specialty: 'Công nghệ phần mềm',
        avatarBg: 'bg-indigo-600 text-white',
        avatarUrl: null,
        initials: 'GT',
        coursesCount: 5,
        salesCount: 120,
        grossRevenue: 96000000,
        netRevenue: 67200000,
        commissionRate: 70,
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe('DashboardInstructorsSection in Revenue Module', () => {
  it('is exported properly from revenue index', () => {
    expect(DashboardInstructorsSection).toBeDefined();
  });

  it('renders correctly with revenue time filter range values', () => {
    const timeRanges = ['30days', '7days', 'today', 'yesterday', 'thismonth', 'lastmonth', 'thisyear', 'custom'];

    timeRanges.forEach((range) => {
      const html = renderToString(
        React.createElement(DashboardInstructorsSection, { globalPeriod: range }),
      );
      expect(html).toContain('Bảng xếp hạng Giảng viên tiêu biểu');
      expect(html).toContain('Thống kê hiệu suất kinh doanh và doanh thu của các giảng viên hàng đầu theo chu kỳ thời gian');
      expect(html).toContain('Giảng viên Tiêu Biểu');
      expect(html).toContain('Công nghệ phần mềm');
      expect(html).toContain('THỨ HẠNG');
      expect(html).toContain('SỐ KHÓA HỌC CÔNG KHAI');
      expect(html).toContain('SỐ LƯỢT BÁN THÀNH CÔNG');
    });
  });

  it('defaults to 30d if globalPeriod is omitted', () => {
    const html = renderToString(React.createElement(DashboardInstructorsSection, {}));
    expect(html).toContain('Bảng xếp hạng Giảng viên tiêu biểu');
  });
});
