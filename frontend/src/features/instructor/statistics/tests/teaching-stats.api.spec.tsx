// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  teachingStatsApi,
  useCoursesRevenueQuery,
  useTeachingOverviewQuery,
} from '../api/teaching-stats.api';
import {
  shouldRetryTeachingStats,
  teachingStatsErrorMessage,
} from '../utils/teaching-stats-error';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { get } }));

function httpError(status: number, data: Record<string, unknown> = {}) {
  return new AxiosError('Private server details', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status, statusText: '', headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() }, data,
  });
}

const incomplete = () => httpError(422, {
  code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
  reason: 'missing_payment_date',
  message: 'Có đơn hàng thiếu ngày thanh toán đã xác thực. Vui lòng liên hệ quản trị viên để đối soát.',
});

describe('Teaching revenue retry policy', () => {
  it.each([400, 401, 403, 404, 422, 429])('does not retry HTTP %i', (status) => {
    expect(shouldRetryTeachingStats(0, httpError(status))).toBe(false);
  });

  it('recognizes incomplete data even if an upstream response uses HTTP 500', () => {
    expect(shouldRetryTeachingStats(0, httpError(500, {
      code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
    }))).toBe(false);
  });

  it('keeps bounded retries for transient server and network failures, not cancellation', () => {
    for (const error of [httpError(500), httpError(503), new AxiosError('Network error', 'ERR_NETWORK')]) {
      expect(shouldRetryTeachingStats(0, error)).toBe(true);
      expect(shouldRetryTeachingStats(1, error)).toBe(true);
      expect(shouldRetryTeachingStats(2, error)).toBe(false);
    }
    expect(shouldRetryTeachingStats(0, new AxiosError('Canceled', 'ERR_CANCELED'))).toBe(false);
  });

  it('shows the actionable business message without exposing arbitrary server errors', () => {
    expect(teachingStatsErrorMessage(incomplete())).toContain('đối soát');
    expect(teachingStatsErrorMessage(httpError(500, { message: 'Private database details' })))
      .not.toContain('Private');
    expect(teachingStatsErrorMessage(new Error('Private database details')))
      .toContain('kiểm tra kết nối');
    expect(teachingStatsErrorMessage(httpError(422, { code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE' })))
      .toContain('Dữ liệu thanh toán chưa đầy đủ');
  });
});

describe.each([
  ['overview', useTeachingOverviewQuery],
  ['courses', useCoursesRevenueQuery],
] as const)('Teaching %s query', (endpoint, useStatsQuery) => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  function Probe({ timeRange = 'today' }: { timeRange?: string }) {
    const query = useStatsQuery({ timeRange });
    return <span>{query.status}</span>;
  }

  async function render(timeRange = 'today') {
    await act(async () => {
      root.render(<QueryClientProvider client={client}><Probe timeRange={timeRange} /></QueryClientProvider>);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    get.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } } });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops after the first incomplete-data response, overriding the default retry policy', async () => {
    get.mockRejectedValue(incomplete());
    await render();
    expect(get).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe('error');
  });

  it('still retries transient failures up to twice', async () => {
    get.mockRejectedValue(httpError(503));
    await render();
    expect(get).toHaveBeenCalledTimes(3);
    expect(host.textContent).toBe('error');
  });

  it('unwraps valid data and sends the selected date filter and abort signal', async () => {
    const data = endpoint === 'overview'
      ? { totalRevenue: 0, instructorEarnings: 0, successfulSales: 0, averageRating: 0, totalReviews: 0 }
      : { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
    get.mockResolvedValue({ data: { data } });
    await render();
    expect(host.textContent).toBe('success');
    expect(get).toHaveBeenCalledWith(`/instructor/teaching-stats/${endpoint}`, {
      params: { timeRange: 'today' }, signal: expect.any(AbortSignal),
    });
  });

  it('aborts an obsolete date-filter request rather than leaving it running', async () => {
    get.mockImplementation(() => new Promise(() => {}));
    await render('all');
    const oldSignal = get.mock.calls[0][1].signal as AbortSignal;
    expect(oldSignal.aborted).toBe(false);
    await render('today');
    expect(oldSignal.aborted).toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].params).toEqual({ timeRange: 'today' });
    expect(get.mock.calls[1][1].signal.aborted).toBe(false);
  });
});

it('passes custom dates and an explicit cancellation signal through the revenue API', async () => {
  get.mockResolvedValue({ data: { data: { items: [] } } });
  const params = { timeRange: 'custom', startDate: '2026-11-01', endDate: '2026-11-22' };
  const signal = new AbortController().signal;
  await teachingStatsApi.getOverview(params, signal);
  await teachingStatsApi.getCoursesRevenue({ ...params, page: 1, limit: 10 }, signal);
  expect(get).toHaveBeenCalledWith('/instructor/teaching-stats/overview', { params, signal });
  expect(get).toHaveBeenCalledWith('/instructor/teaching-stats/courses', {
    params: { ...params, page: 1, limit: 10 }, signal,
  });
});
