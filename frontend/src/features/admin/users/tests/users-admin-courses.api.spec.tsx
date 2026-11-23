// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usersAdminApi, usersAdminKeys, useAdminUserEnrolledCoursesQuery, useAdminUserTeachingQuery,
  useUpdateUserAdminMutation,
} from '../api/users-admin.api';

const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: mocks }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe.each([
  ['enrolled-courses', useAdminUserEnrolledCoursesQuery, usersAdminKeys.enrolledCourses],
  ['teaching', useAdminUserTeachingQuery, usersAdminKeys.teaching],
] as const)('Admin user %s requests', (endpoint, useCoursesQuery, key) => {
  let root: Root;
  let host: HTMLDivElement;
  let client: QueryClient;

  function Probe({ userId }: { userId: string }) {
    const query = useCoursesQuery(userId);
    return <span>{query.status}:{JSON.stringify(query.data)}</span>;
  }

  async function render(userId: string) {
    await act(async () => {
      root.render(<QueryClientProvider client={client}><Probe userId={userId} /></QueryClientProvider>);
    });
    await act(async () => { await vi.runAllTimersAsync(); });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    vi.clearAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retryDelay: 0 } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses a per-account cache key, unwraps backend data and passes cancellation', async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });
    await render('account-a');
    expect(host.textContent).toBe('success:[]');
    expect(mocks.get).toHaveBeenCalledWith(`/users/account-a/${endpoint}`, { signal: expect.any(AbortSignal) });
    expect(key('account-a')).not.toEqual(key('account-b'));
    expect(client.getQueryData(key('account-a'))).toEqual([]);
    expect(client.getQueryData(key('account-b'))).toBeUndefined();
  });

  it('does not fetch without an account ID', async () => {
    await render('');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('aborts a previous account request and never displays its data for the next account', async () => {
    mocks.get.mockImplementation(() => new Promise(() => {}));
    await render('account-a');
    const oldSignal = mocks.get.mock.calls[0][1].signal as AbortSignal;
    mocks.get.mockResolvedValue({ data: { data: ['account-b-only'] } });
    await render('account-b');
    expect(oldSignal.aborted).toBe(true);
    expect(mocks.get.mock.calls[1][0]).toBe(`/users/account-b/${endpoint}`);
    expect(host.textContent).toBe('success:["account-b-only"]');
  });

  it('reports data errors immediately without falling back to empty or sample values', async () => {
    mocks.get.mockRejectedValue({ response: { status: 422, data: { code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE' } } });
    await render('account-a');
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe('error:');
    expect(client.getQueryData(key('account-a'))).toBeUndefined();
  });

  it('refetches when revisiting an account, instead of keeping a stale dashboard snapshot', async () => {
    mocks.get.mockResolvedValue({ data: { data: ['old'] } });
    await render('account-a');
    await render('account-b');
    mocks.get.mockResolvedValue({ data: { data: ['updated'] } });
    await render('account-a');
    expect(mocks.get.mock.calls.filter(([url]) => url === `/users/account-a/${endpoint}`)).toHaveLength(2);
    expect(host.textContent).toBe('success:["updated"]');
  });
});

it('invalidates profile, enrollment and teaching queries when account details change', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const client = new QueryClient();
  const host = document.createElement('div');
  const root = createRoot(host);
  let mutation: ReturnType<typeof useUpdateUserAdminMutation>;
  function Probe() { mutation = useUpdateUserAdminMutation(); return null; }
  const keys = [usersAdminKeys.detail('a'), usersAdminKeys.enrolledCourses('a'), usersAdminKeys.teaching('a')];
  keys.forEach((key) => client.setQueryData(key, {}));
  mocks.patch.mockResolvedValue({ data: { data: { id: 'a', fullName: 'Updated' } } });
  try {
    act(() => root.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
    await act(async () => { await mutation.mutateAsync({ userId: 'a', payload: { fullName: 'Updated' } }); });
    keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  } finally {
    act(() => root.unmount());
    client.clear();
    vi.unstubAllGlobals();
  }
});

it('does not insert frontend sample data when either direct API call fails', async () => {
  mocks.get.mockRejectedValue(new Error('Unavailable'));
  await expect(usersAdminApi.getEnrolledCourses('a')).rejects.toThrow('Unavailable');
  await expect(usersAdminApi.getTeaching('a')).rejects.toThrow('Unavailable');
});
