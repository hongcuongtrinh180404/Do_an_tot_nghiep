// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseStatusEnum } from 'share-lib';
import {
  adminCoursesApi,
  adminCoursesKeys,
  useApproveCourseMutation,
  useRejectCourseMutation,
} from '../api/admin-courses.api';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: mocks }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('Admin course statistics API and cache', () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  let approve: ReturnType<typeof useApproveCourseMutation>;
  let reject: ReturnType<typeof useRejectCourseMutation>;
  const stats = { total: 20, published: 15, draft: 2, archived: 1, pendingApproval: 2 };
  const listKey = adminCoursesKeys.list({ page: 2, search: 'React', status: CourseStatusEnum.DRAFT });

  function Harness() {
    approve = useApproveCourseMutation();
    reject = useRejectCourseMutation();
    return null;
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(adminCoursesKeys.stats(), stats);
    client.setQueryData(listKey, { items: [], total: 2 });
    act(() => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it('requests global statistics without passing table filters or pagination', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, data: stats } });
    expect(await adminCoursesApi.getStats()).toEqual(stats);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith('/courses/admin/stats');
    expect(adminCoursesKeys.stats()).toEqual(['admin-courses', 'stats']);
  });

  it('invalidates both statistics and filtered lists after approval', async () => {
    mocks.post.mockResolvedValue({ data: { data: { id: 'course', title: 'React', status: CourseStatusEnum.PUBLISHED } } });
    await act(async () => { await approve.mutateAsync('course'); });

    expect(mocks.post).toHaveBeenCalledWith('/courses/course/approve');
    expect(client.getQueryState(adminCoursesKeys.stats())?.isInvalidated).toBe(true);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
  });

  it('invalidates both statistics and filtered lists after rejection', async () => {
    mocks.post.mockResolvedValue({ data: { data: { id: 'course', title: 'React', status: CourseStatusEnum.DRAFT } } });
    await act(async () => { await reject.mutateAsync({ courseId: 'course', reason: 'Cần bổ sung nội dung' }); });

    expect(mocks.post).toHaveBeenCalledWith('/courses/course/reject', { reason: 'Cần bổ sung nội dung' });
    expect(client.getQueryState(adminCoursesKeys.stats())?.isInvalidated).toBe(true);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
  });

  it('does not invent counts or invalidate successful data after a failed mutation', async () => {
    mocks.post.mockRejectedValue(new Error('Network unavailable'));
    await act(async () => { await expect(approve.mutateAsync('course')).rejects.toThrow('Network unavailable'); });
    expect(client.getQueryData(adminCoursesKeys.stats())).toEqual(stats);
    expect(client.getQueryState(adminCoursesKeys.stats())?.isInvalidated).toBe(false);
  });
});
