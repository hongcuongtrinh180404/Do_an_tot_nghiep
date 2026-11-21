// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RevenueChart } from '../components/revenue-chart';
import type { IRevenueChartItem } from 'share-lib';

// Mock chart.js so it doesn't fail in node/vitest server environment
vi.mock('chart.js/auto', () => {
  return {
    default: class MockChart {
      data = { labels: [], datasets: [] };
      update = vi.fn();
      destroy = vi.fn();
      setDatasetVisibility = vi.fn();
      static getChart = vi.fn().mockReturnValue(null);
    },
  };
});

describe('RevenueChart Component in Admin Revenue Feature', () => {
  const mockChartData: IRevenueChartItem[] = [
    {
      date: '2026-11-01',
      label: '01/11',
      totalRevenue: 5000000,
      platformCommission: 1500000,
      instructorEarnings: 3500000,
      orderCount: 10,
    },
    {
      date: '2026-11-02',
      label: '02/11',
      totalRevenue: 8000000,
      platformCommission: 2400000,
      instructorEarnings: 5600000,
      orderCount: 16,
    },
  ];

  it('renders loading overlay when isLoading is true without breaking frame', () => {
    const html = renderToString(
      React.createElement(RevenueChart, { isLoading: true }),
    );
    expect(html).toContain('Đang cập nhật số liệu biểu đồ...');
    expect(html).toContain('id="revenueChartCanvas"');
  });

  it('renders honest empty state overlay when data is empty array while keeping canvas mounted', () => {
    const html = renderToString(
      React.createElement(RevenueChart, { data: [], isLoading: false }),
    );
    expect(html).toContain('Chưa có dữ liệu giao dịch phát sinh trong khoảng thời gian này');
    expect(html).toContain('id="revenueChartCanvas"');
  });

  it.each([
    { name: 'loaded', props: { data: mockChartData } },
    { name: 'loading', props: { isLoading: true } },
    { name: 'empty', props: { data: [] } },
  ])('keeps a compact content-sized frame in the $name state', ({ props }) => {
    const html = renderToString(React.createElement(RevenueChart, props));
    const document = new DOMParser().parseFromString(html, 'text/html');
    const section = document.querySelector('#revenue-chart-section');
    const canvas = section?.querySelector('#revenueChartCanvas');
    const viewport = canvas?.parentElement;

    expect(section?.classList.contains('h-auto')).toBe(true);
    expect(section?.classList.contains('gap-3')).toBe(true);
    expect(section?.classList.contains('h-full')).toBe(false);
    expect(section?.classList.contains('justify-between')).toBe(false);
    expect(viewport?.classList.contains('h-56')).toBe(true);
    expect(viewport?.classList.contains('sm:h-64')).toBe(true);
    expect(viewport?.classList.contains('shrink-0')).toBe(true);
    expect(viewport?.classList.contains('min-h-[288px]')).toBe(false);
  });

  it('renders controls, series toggles, summary and footnote when data is provided', () => {
    const html = renderToString(
      React.createElement(RevenueChart, { data: mockChartData, isLoading: false }),
    );

    // Title and description
    expect(html).toContain('Biểu Đồ Doanh Thu &amp; Hoa Hồng');
    expect(html).toContain('Phân tích chi tiết biến động doanh thu toàn sàn');

    // Controls: Line & Bar
    expect(html).toContain('Line');
    expect(html).toContain('Bar');

    // Series buttons with accessible aria-pressed
    expect(html).toContain('Tổng doanh thu');
    expect(html).toContain('Doanh thu nền tảng (Mindly)');
    expect(html).toContain('Doanh thu giảng viên');
    expect(html).toContain('aria-pressed="true"');

    // Total metric summary (5m + 8m = 13m)
    expect(html).toContain('13.000.000');
    expect(html).toContain('26'); // total orders 10 + 16

    // Footnote
    expect(html).toContain('Nguyên tắc ghi nhận lịch sử hoa hồng:');
  });
});
