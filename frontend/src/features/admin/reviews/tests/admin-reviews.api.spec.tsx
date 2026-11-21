// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewKeys } from '@/features/course/api/review.api';
import { adminReviewKeys, adminReviewsApi, useAdminReplyReviewMutation } from '../api/admin-reviews.api';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: mocks }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('Admin review reply API and cache', () => {
  let root: Root;
  let host: HTMLDivElement;
  let client: QueryClient;
  let mutation: ReturnType<typeof useAdminReplyReviewMutation>;
  const review = { id: 'review-1', courseId: 'course-1', adminReply: null };
  const updatedReview = { ...review, adminReply: { content: 'Lỗi đã được khắc phục.' } };
  const listKey = adminReviewKeys.list({ page: 1, status: 'visible' });

  function Harness() {
    mutation = useAdminReplyReviewMutation();
    return null;
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.resetAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(adminReviewKeys.detail(review.id), review);
    client.setQueryData(listKey, { items: [review] });
    client.setQueryData(reviewKeys.list(review.courseId), { items: [review] });
    client.setQueryData(reviewKeys.myReview(review.courseId), review);
    act(() => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    host.remove();
    vi.unstubAllGlobals();
  });

  it('posts only the reply payload to the admin-only endpoint', async () => {
    mocks.post.mockResolvedValue({ data: { data: updatedReview } });
    expect(await adminReviewsApi.replyToReview(review.id, { reply: 'Lỗi đã được khắc phục.' })).toEqual(updatedReview);
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/reviews/admin/review-1/reply', { reply: 'Lỗi đã được khắc phục.' });
  });

  it('immediately updates detail and invalidates admin, public and owner review caches', async () => {
    mocks.post.mockResolvedValue({ data: { data: updatedReview } });
    await act(async () => {
      await mutation.mutateAsync({ id: review.id, payload: { reply: 'Lỗi đã được khắc phục.' } });
    });
    expect(client.getQueryData(adminReviewKeys.detail(review.id))).toEqual(updatedReview);
    for (const key of [listKey, reviewKeys.list(review.courseId), reviewKeys.myReview(review.courseId)]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it('does not replace a saved reply or invalidate successful data on failure', async () => {
    mocks.post.mockRejectedValue(new Error('Unavailable'));
    await act(async () => {
      await expect(mutation.mutateAsync({ id: review.id, payload: { reply: 'Phản hồi' } })).rejects.toThrow('Unavailable');
    });
    expect(client.getQueryData(adminReviewKeys.detail(review.id))).toEqual(review);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(reviewKeys.myReview(review.courseId))?.isInvalidated).toBe(false);
  });
});
