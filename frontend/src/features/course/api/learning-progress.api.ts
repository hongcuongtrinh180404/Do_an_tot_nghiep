'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { IApiResponse, ICourseLearningProgress, IPlaybackHeartbeat, IPlaybackSessionResponse, IStartPlaybackSession } from 'share-lib';
import { apiClient, API_BASE_URL } from '@/lib/api-client';

export const learningProgressKeys = {
  user: (userId: string) => ['learning-progress', userId] as const,
  course: (userId: string, courseId: string) => [...learningProgressKeys.user(userId), 'course', courseId] as const,
  myCourses: (userId: string) => [...learningProgressKeys.user(userId), 'my-courses'] as const,
};

// Await a previous lesson's final save before claiming the same course in the next lesson.
const pendingReleases = new Map<string, Promise<unknown>>();
const pendingStarts = new Map<string, Promise<IPlaybackSessionResponse>>();

export const learningProgressApi = {
  async getProgress(courseId: string): Promise<ICourseLearningProgress | null> {
    const res = await apiClient.get<IApiResponse<ICourseLearningProgress | null>>(`/learning-progress/courses/${courseId}`);
    return res.data.data;
  },
  async getMyProgress(): Promise<ICourseLearningProgress[]> {
    const res = await apiClient.get<IApiResponse<ICourseLearningProgress[]>>('/learning-progress/my-courses');
    return res.data.data;
  },
  start(userId: string, courseId: string, payload: IStartPlaybackSession): Promise<IPlaybackSessionResponse> {
    const key = `${userId}:${courseId}`;
    const request = (pendingStarts.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      await pendingReleases.get(key);
      const res = await apiClient.post<IApiResponse<IPlaybackSessionResponse>>(`/learning-progress/courses/${courseId}/sessions`, payload);
      return res.data.data;
    });
    pendingStarts.set(key, request);
    void request.finally(() => { if (pendingStarts.get(key) === request) pendingStarts.delete(key); }).catch(() => undefined);
    return request;
  },
  async heartbeat(courseId: string, payload: IPlaybackHeartbeat): Promise<IPlaybackSessionResponse> {
    const res = await apiClient.post<IApiResponse<IPlaybackSessionResponse>>(`/learning-progress/courses/${courseId}/heartbeat`, payload);
    return res.data.data;
  },
  end(userId: string, courseId: string, payload: IPlaybackHeartbeat, keepalive = false): Promise<IPlaybackSessionResponse> {
    const path = `/learning-progress/courses/${courseId}/end`;
    // sendBeacon cannot attach our Bearer header. keepalive also works during pagehide.
    const request: Promise<IPlaybackSessionResponse> = keepalive
      ? fetch(`${API_BASE_URL}${path}`, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) throw new Error('Không thể lưu tiến độ cuối phiên');
        const body = await response.json() as IApiResponse<IPlaybackSessionResponse>;
        return body.data;
      })
      : apiClient.post<IApiResponse<IPlaybackSessionResponse>>(path, payload).then((res) => res.data.data);
    const key = `${userId}:${courseId}`;
    const release = request.catch(() => undefined).finally(() => {
      if (pendingReleases.get(key) === release) pendingReleases.delete(key);
    });
    pendingReleases.set(key, release);
    return request;
  },
};

export function cacheLearningProgress(client: QueryClient, userId: string, progress: ICourseLearningProgress): void {
  const newer = (old?: ICourseLearningProgress | null) => !old || progress.revision >= old.revision;
  client.setQueryData<ICourseLearningProgress | null>(learningProgressKeys.course(userId, progress.courseId),
    (old) => newer(old) ? progress : old);
  client.setQueryData<ICourseLearningProgress[]>(learningProgressKeys.myCourses(userId),
    (old) => old?.map((item) => item.courseId === progress.courseId && newer(item) ? progress : item));
}

export function useCourseLearningProgressQuery(userId: string | undefined, courseId: string, enabled = true) {
  return useQuery({
    queryKey: learningProgressKeys.course(userId ?? '', courseId),
    queryFn: () => learningProgressApi.getProgress(courseId),
    enabled: Boolean(userId && courseId) && enabled,
    staleTime: 10_000, retry: 1,
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always', refetchOnReconnect: 'always',
  });
}

export function useMyLearningProgressQuery(userId: string | undefined) {
  return useQuery({
    queryKey: learningProgressKeys.myCourses(userId ?? ''),
    queryFn: learningProgressApi.getMyProgress,
    enabled: Boolean(userId), staleTime: 10_000, retry: 1,
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always', refetchOnReconnect: 'always',
  });
}
