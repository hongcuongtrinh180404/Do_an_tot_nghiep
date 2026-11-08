import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import type { AxiosAdapter } from 'axios';
import { LearningStatusEnum, type ICourseLearningProgress } from 'share-lib';
import { apiClient } from '../../../lib/api-client';
import { cacheLearningProgress, learningProgressApi, learningProgressKeys } from '../api/learning-progress.api';

function progress(watchedMs = 0, updatedAt = '2026-11-08T00:00:00Z'): ICourseLearningProgress {
  return { courseId: 'course', revision: watchedMs, watchedMs, totalDurationMs: 100_000, progressPercent: watchedMs / 1000,
    status: LearningStatusEnum.IN_PROGRESS, lastLessonId: 'lesson', lastPositionSeconds: 1, updatedAt };
}

describe('Learning progress client coordination', () => {
  const originalAdapter = apiClient.defaults.adapter;
  afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

  it('isolates caches by student and does not overwrite newer final saves with late responses', () => {
    const client = new QueryClient();
    client.setQueryData(learningProgressKeys.myCourses('student-a'), [progress()]);
    cacheLearningProgress(client, 'student-a', progress(20_000, '2026-11-08T00:00:20Z'));
    cacheLearningProgress(client, 'student-a', progress(10_000, '2026-11-08T00:00:10Z'));
    assert.equal(client.getQueryData<ICourseLearningProgress>(learningProgressKeys.course('student-a', 'course'))?.watchedMs, 20_000);
    assert.equal(client.getQueryData<ICourseLearningProgress[]>(learningProgressKeys.myCourses('student-a'))?.[0].watchedMs, 20_000);
    assert.equal(client.getQueryData(learningProgressKeys.course('student-b', 'course')), undefined);
    client.clear();
  });

  it('uses the write revision even when old and new responses share a timestamp', () => {
    const client = new QueryClient();
    cacheLearningProgress(client, 'student-a', { ...progress(1000), revision: 3, lastPositionSeconds: 50 });
    cacheLearningProgress(client, 'student-a', { ...progress(1000), revision: 2, lastPositionSeconds: 10 });
    assert.equal(client.getQueryData<ICourseLearningProgress>(learningProgressKeys.course('student-a', 'course'))?.lastPositionSeconds, 50);
    client.clear();
  });

  it('waits for a final save before claiming the same course after lesson navigation', async () => {
    const calls: string[] = [];
    let releaseEnd!: () => void;
    const endGate = new Promise<void>((resolve) => { releaseEnd = resolve; });
    apiClient.defaults.adapter = (async (config) => {
      calls.push(config.url!);
      if (config.url?.endsWith('/end')) await endGate;
      return { data: { data: { sessionId: 'session', expiresAt: new Date().toISOString(), progress: progress() } },
        status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    const end = learningProgressApi.end('student', 'navigation-course', { sessionId: 'old', sequence: 1, watchedMs: 0, positionSeconds: 0 });
    const next = learningProgressApi.start('student', 'navigation-course', { sessionId: 'new', lessonId: 'next' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['/learning-progress/courses/navigation-course/end']);
    releaseEnd();
    await Promise.all([end, next]);
    assert.equal(calls[1], '/learning-progress/courses/navigation-course/sessions');
  });

  it('serializes a late start response, its cleanup, and the next lesson start', async () => {
    const calls: string[] = [];
    let releaseStart!: () => void;
    const gate = new Promise<void>((resolve) => { releaseStart = resolve; });
    apiClient.defaults.adapter = (async (config) => {
      const body = JSON.parse(config.data as string) as { sessionId: string };
      calls.push(`${config.url}:${body.sessionId}`);
      if (body.sessionId === 'old' && config.url?.endsWith('/sessions')) await gate;
      return { data: { data: { sessionId: body.sessionId, expiresAt: new Date().toISOString(), progress: progress() } },
        status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    const old = learningProgressApi.start('student', 'late-course', { sessionId: 'old', lessonId: 'first' }).then(() =>
      learningProgressApi.end('student', 'late-course', { sessionId: 'old', sequence: 1, watchedMs: 0, positionSeconds: 0 }));
    const next = learningProgressApi.start('student', 'late-course', { sessionId: 'new', lessonId: 'second' });
    releaseStart();
    await Promise.all([old, next]);
    assert.deepEqual(calls, [
      '/learning-progress/courses/late-course/sessions:old',
      '/learning-progress/courses/late-course/end:old',
      '/learning-progress/courses/late-course/sessions:new',
    ]);
  });
});
