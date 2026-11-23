// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enrollmentKeys, useRegisterFreeCourseMutation } from '../api/enrollment.api';
import { publicCourseKeys } from '../api/public-courses.api';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));
vi.mock('../api/course.api', () => ({ courseKeys: { all: ['courses'] } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => { vi.unstubAllGlobals(); });

describe('enrollment count cache refresh', () => {
  it('invalidates detail, catalog, instructor and purchased-course data after successful registration', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const keys = [
      enrollmentKeys.publicDetail('course'), enrollmentKeys.myCourses(),
      publicCourseKeys.catalog({ limit: 12 }), publicCourseKeys.byInstructor('teacher'),
    ];
    for (const key of keys) client.setQueryData(key, { studentsCount: 0 });
    post.mockResolvedValue({ data: { data: { id: 'enrollment', courseId: 'course' } } });

    let mutation: ReturnType<typeof useRegisterFreeCourseMutation> | undefined;
    function Harness() {
      mutation = useRegisterFreeCourseMutation('course');
      return null;
    }
    const root = createRoot(document.createElement('div'));
    try {
      act(() => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
      await act(async () => { await mutation!.mutateAsync(); });
      expect(post).toHaveBeenCalledWith('/enrollments/register-free', { courseId: 'course' });
      for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    } finally {
      act(() => root.unmount());
      client.clear();
    }
  });
});
