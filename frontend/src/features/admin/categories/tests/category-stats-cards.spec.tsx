// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryStatsCards } from '../components/category-stats-cards';

type Props = React.ComponentProps<typeof CategoryStatsCards>;

describe('Category statistics cards', () => {
  let container: HTMLDivElement;
  let root: Root;
  let props: Props;

  function render(overrides: Partial<Props> = {}) {
    act(() => root.render(<CategoryStatsCards {...props} {...overrides} />));
  }

  function values() {
    return Array.from(container.querySelectorAll('[data-stat-value]'), (node) => node.textContent);
  }

  function button(key: string) {
    const node = container.querySelector<HTMLButtonElement>(`[data-stat="${key}"] button`);
    expect(node).not.toBeNull();
    return node!;
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    props = {
      totalCount: 1234,
      activeCount: 1200,
      inactiveCount: 34,
      totalCoursesCount: 5678,
      currentStatus: 'ALL',
      onStatusChange: vi.fn(),
      isLoading: false,
    };
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows all four counts with Vietnamese number formatting', () => {
    render();

    expect(values()).toEqual(['1.234', '1.200', '34', '5.678']);
    expect(container.querySelectorAll('[data-stat]')).toHaveLength(4);
    expect(container.textContent).toContain('Tổng danh mục');
    expect(container.textContent).toContain('Đang hiển thị');
    expect(container.textContent).toContain('Đang tạm ẩn');
    expect(container.textContent).toContain('Khóa học liên kết');
    expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe('false');
  });

  it.each([
    ['total', 'ALL'],
    ['active', 'ACTIVE'],
    ['inactive', 'INACTIVE'],
  ])('uses the %s card to select the %s filter', (key, status) => {
    render();

    act(() => button(key).click());

    expect(props.onStatusChange).toHaveBeenCalledExactlyOnceWith(status);
  });

  it('marks only the current status as selected without changing the global counts', () => {
    render();
    expect(button('total').getAttribute('aria-pressed')).toBe('true');
    expect(button('active').getAttribute('aria-pressed')).toBe('false');
    expect(button('inactive').getAttribute('aria-pressed')).toBe('false');

    render({ currentStatus: 'INACTIVE' });

    expect(button('total').getAttribute('aria-pressed')).toBe('false');
    expect(button('active').getAttribute('aria-pressed')).toBe('false');
    expect(button('inactive').getAttribute('aria-pressed')).toBe('true');
    expect(values()).toEqual(['1.234', '1.200', '34', '5.678']);
  });

  it('keeps the linked course count informational rather than adding a status filter', () => {
    render();

    expect(container.querySelector('[data-stat="courses"] button')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(3);
    expect(props.onStatusChange).not.toHaveBeenCalled();
  });

  it('shows real zeros when there are no categories or linked courses', () => {
    render({ totalCount: 0, activeCount: 0, inactiveCount: 0, totalCoursesCount: 0 });

    expect(values()).toEqual(['0', '0', '0', '0']);
    expect(container.querySelector('[aria-label="Đang tải số liệu"]')).toBeNull();
  });

  it('keeps the layout while loading and prevents filters from being selected', () => {
    render({ isLoading: true });

    expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('[aria-label="Đang tải số liệu"]')).toHaveLength(4);
    expect(values()).toEqual(['', '', '', '']);
    expect(Array.from(container.querySelectorAll('button'), (node) => node.disabled)).toEqual([
      true,
      true,
      true,
    ]);
    act(() => button('active').click());
    expect(props.onStatusChange).not.toHaveBeenCalled();

    render();

    expect(values()).toEqual(['1.234', '1.200', '34', '5.678']);
    expect(button('active').disabled).toBe(false);
    expect(container.querySelector('[aria-label="Đang tải số liệu"]')).toBeNull();
  });
});
