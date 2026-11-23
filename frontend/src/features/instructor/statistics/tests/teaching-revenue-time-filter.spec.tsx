// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import {
  TeachingRevenueTimeFilter,
  type TeachingTimeFilterValue,
} from '../components/teaching-revenue-time-filter';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) =>
    React.createElement('span', { 'data-icon': icon, className }),
}));

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  );
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('TeachingRevenueTimeFilter', () => {
  let root: Root;
  let host: HTMLDivElement;
  const onChange = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    onChange.mockReset();
    vi.clearAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
  });

  it('renders all-time option when explicitly selected', async () => {
    const value: TeachingTimeFilterValue = { timeRange: 'all' };

    await act(async () => {
      root.render(
        React.createElement(TeachingRevenueTimeFilter, {
          value,
          onChange,
        }),
      );
    });

    expect(host.textContent).toContain('Kỳ báo cáo:');
    expect(host.textContent).toContain('Tất cả thời gian');
    expect(host.textContent).not.toContain('(Mặc định)');
    expect(host.textContent).toContain('Toàn bộ thời gian');
    expect(host.querySelector('input[type="date"]')).toBeNull();
  });

  it.each(['today', ''])('renders today with its date badge for timeRange=%j', async (timeRange) => {
    const value: TeachingTimeFilterValue = { timeRange };

    await act(async () => {
      root.render(
        React.createElement(TeachingRevenueTimeFilter, {
          value,
          onChange,
        }),
      );
    });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    expect(host.querySelector('[role="combobox"]')?.textContent).toBe('Hôm nay');
    expect(host.textContent).toContain(todayStr);
    expect(host.querySelector('input[type="date"]')).toBeNull();
  });

  it('renders custom date pickers when timeRange is custom', async () => {
    const value: TeachingTimeFilterValue = {
      timeRange: 'custom',
      startDate: '2026-11-01',
      endDate: '2026-11-22',
    };

    await act(async () => {
      root.render(
        React.createElement(TeachingRevenueTimeFilter, {
          value,
          onChange,
        }),
      );
    });

    const startInput = host.querySelector('input[aria-label="Từ ngày"]') as HTMLInputElement;
    const endInput = host.querySelector('input[aria-label="Đến ngày"]') as HTMLInputElement;
    const applyButton = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Áp dụng'),
    );

    expect(startInput).not.toBeNull();
    expect(endInput).not.toBeNull();
    expect(applyButton).toBeDefined();

    expect(startInput.value).toBe('2026-11-01');
    expect(endInput.value).toBe('2026-11-22');
    expect(host.textContent).toContain('Tùy chỉnh: 2026-11-01 – 2026-11-22');
  });

  it('applies custom dates without announcing success before the report has loaded', async () => {
    const value: TeachingTimeFilterValue = {
      timeRange: 'custom',
      startDate: '2026-11-01',
      endDate: '2026-11-22',
    };

    await act(async () => {
      root.render(
        React.createElement(TeachingRevenueTimeFilter, {
          value,
          onChange,
        }),
      );
    });

    const startInput = host.querySelector('input[aria-label="Từ ngày"]') as HTMLInputElement;
    const endInput = host.querySelector('input[aria-label="Đến ngày"]') as HTMLInputElement;
    const applyButton = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Áp dụng'),
    ) as HTMLButtonElement;

    await act(async () => {
      setInputValue(startInput, '2026-11-05');
      setInputValue(endInput, '2026-11-15');
    });

    await act(async () => {
      applyButton.click();
    });

    expect(onChange).toHaveBeenCalledWith({
      timeRange: 'custom',
      startDate: '2026-11-05',
      endDate: '2026-11-15',
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows error toast and does not call onChange if startDate > endDate', async () => {
    const value: TeachingTimeFilterValue = {
      timeRange: 'custom',
      startDate: '2026-11-01',
      endDate: '2026-11-22',
    };

    await act(async () => {
      root.render(
        React.createElement(TeachingRevenueTimeFilter, {
          value,
          onChange,
        }),
      );
    });

    const startInput = host.querySelector('input[aria-label="Từ ngày"]') as HTMLInputElement;
    const endInput = host.querySelector('input[aria-label="Đến ngày"]') as HTMLInputElement;
    const applyButton = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Áp dụng'),
    ) as HTMLButtonElement;

    await act(async () => {
      setInputValue(startInput, '2026-11-25');
      setInputValue(endInput, '2026-11-10');
    });

    await act(async () => {
      applyButton.click();
    });

    expect(toast.error).toHaveBeenCalledWith('Ngày bắt đầu không được lớn hơn ngày kết thúc');
    expect(onChange).not.toHaveBeenCalled();
  });
});
