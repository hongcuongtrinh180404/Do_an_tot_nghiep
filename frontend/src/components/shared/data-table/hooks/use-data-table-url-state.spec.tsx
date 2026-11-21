// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDataTableUrlState } from './use-data-table-url-state';

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/courses',
  useSearchParams: () => navigation.searchParams,
  useRouter: () => ({ replace: navigation.replace }),
}));

describe('Data table URL filter updates', () => {
  let container: HTMLDivElement;
  let root: Root;
  let state: ReturnType<typeof useDataTableUrlState>;

  function Harness() {
    state = useDataTableUrlState();
    return null;
  }

  function render(query: string) {
    navigation.searchParams = new URLSearchParams(query);
    act(() => root.render(<Harness />));
  }

  function updatedParams() {
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    const [url, options] = navigation.replace.mock.calls[0];
    expect(options).toEqual({ scroll: false });
    return new URL(url, 'http://localhost:3000').searchParams;
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

  it('removes related filters atomically while preserving unrelated parameters', () => {
    render('tab=HISTORY&historyStatus=APPROVED&page=4&limit=20&search=React&sort=title%3Aasc');

    act(() => state.setFilters({ tab: [], historyStatus: [] }));

    expect(Object.fromEntries(updatedParams())).toEqual({
      page: '1', limit: '20', search: 'React', sort: 'title:asc',
    });
  });

  it('sets string and array filters together with a single navigation', () => {
    render('page=3&limit=20');

    act(() => state.setFilters({ tab: 'HISTORY', historyStatus: ['APPROVED', 'REJECTED'] }));

    expect(Object.fromEntries(updatedParams())).toEqual({
      page: '1', limit: '20', tab: 'HISTORY', historyStatus: 'APPROVED,REJECTED',
    });
  });

  it.each([
    { label: 'undefined', value: undefined },
    { label: 'an empty string', value: '' },
    { label: 'an empty array', value: [] },
  ])('removes filters with $label', ({ value }) => {
    render('status=published&page=3');

    act(() => state.setFilters({ status: value }));

    expect(Object.fromEntries(updatedParams())).toEqual({ page: '1' });
  });

  it('keeps the single-filter setter compatible with existing callers', () => {
    render('tab=HISTORY&page=3');

    act(() => state.setFilter('historyStatus', ['APPROVED']));

    expect(Object.fromEntries(updatedParams())).toEqual({
      tab: 'HISTORY', page: '1', historyStatus: 'APPROVED',
    });
  });
});
