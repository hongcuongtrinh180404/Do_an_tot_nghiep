import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useAdminDashboardChartQuery } from '../dashboard/api/admin-dashboard.api';
import { DashboardRevenueSection } from '../dashboard/components/dashboard-revenue-section';
import type { IDashboardRevenueChartPoint } from '../dashboard/types';

vi.mock('../dashboard/api/admin-dashboard.api', () => ({
  useAdminDashboardChartQuery: vi.fn(() => ({ data: undefined })),
}));

describe('DashboardRevenueSection', () => {
  const customDates = {
    startDate: '2026-11-01',
    endDate: '2026-11-19',
  };
  const initialChartData: IDashboardRevenueChartPoint[] = [
    {
      date: '2026-11-01',
      label: '01/11',
      grossRevenue: 5000000,
      platformRevenue: 1500000,
      instructorRevenue: 3500000,
      orderCount: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default period and queries without custom dates', () => {
    const html = renderToString(
      React.createElement(DashboardRevenueSection, {
        globalPeriod: 'this_month',
        initialChartData,
      }),
    );

    expect(useAdminDashboardChartQuery).toHaveBeenCalledWith('this_month', 'day', undefined);
    expect(html).toContain('id="revenueChart"');
    expect(html).toContain('5.000.000');
  });

  it('forwards the selected custom dates to the chart query', () => {
    const html = renderToString(
      React.createElement(DashboardRevenueSection, {
        globalPeriod: 'custom',
        customDates,
        initialChartData,
      }),
    );

    expect(useAdminDashboardChartQuery).toHaveBeenCalledWith('custom', 'day', customDates);
    expect(html).toContain('id="revenueChart"');
  });

  it('does not forward saved custom dates for a preset period', () => {
    renderToString(
      React.createElement(DashboardRevenueSection, {
        globalPeriod: 'this_month',
        customDates,
      }),
    );

    expect(useAdminDashboardChartQuery).toHaveBeenCalledWith('this_month', 'day', undefined);
  });

  it('renders a custom period when optional custom dates are not provided', () => {
    const html = renderToString(
      React.createElement(DashboardRevenueSection, {
        globalPeriod: 'custom',
      }),
    );

    expect(useAdminDashboardChartQuery).toHaveBeenCalledWith('custom', 'day', undefined);
    expect(html).toContain('id="revenueChart"');
  });
});
