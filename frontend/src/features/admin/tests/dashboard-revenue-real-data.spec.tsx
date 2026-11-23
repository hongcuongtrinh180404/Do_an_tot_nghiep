import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardRevenueSection } from '../dashboard/components/dashboard-revenue-section';

const query = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../dashboard/api/admin-dashboard.api', () => ({
  useAdminDashboardChartQuery: () => query.value,
}));
vi.mock('chart.js/auto', () => ({ default: vi.fn() }));

const initial = [{ date: '2026-11-23', label: '23/11', grossRevenue: 9000, platformRevenue: 2700, instructorRevenue: 6300, orderCount: 3 }];
const render = () => renderToStaticMarkup(<DashboardRevenueSection globalPeriod="this_month" initialChartData={initial} />);

describe('Revenue chart only displays database-backed API data', () => {
  beforeEach(() => { query.value = { data: undefined, isError: false, isLoading: false, refetch: vi.fn() }; });
  it('uses the exact returned amount without multiplying by a mock factor', () => {
    query.value.data = [{ ...initial[0], grossRevenue: 123456 }];
    expect(render()).toContain('123.456');
    expect(render()).not.toContain('9.000');
  });
  it('treats an empty response as authoritative rather than reusing initial data', () => {
    query.value.data = [];
    const html = render();
    expect(html).toContain('Chưa có dữ liệu doanh thu');
    expect(html).not.toContain('9.000');
  });
  it('shows an error and no stale or mock amount when the API fails', () => {
    query.value = { ...query.value, data: initial, isError: true };
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain('Không có số liệu thay thế');
    expect(html).toContain('Thử lại');
    expect(html).not.toContain('9.000');
  });
  it('uses initial aggregate API data only while the chart query has no result', () => {
    query.value.isLoading = true;
    expect(render()).toContain('9.000');
  });
});
