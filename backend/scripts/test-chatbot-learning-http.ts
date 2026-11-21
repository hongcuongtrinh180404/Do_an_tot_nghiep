import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { LearningStatusEnum, type ICourseLearningProgress } from 'share-lib';
import type { ChatbotMessageResponse } from '../src/modules/chatbot/http/chatbot-response.projection.js';
import type { ChatbotOwnedCourse } from '../src/modules/chatbot/tools/my-learning.types.js';

// Uses an existing test-account JWT and an already-running backend. No login,
// enrollments, playback sessions, heartbeat, completion or payment writes.
let stage = 'configuration';
let httpStatus: number | undefined;
let requests = 0;
const checks: string[] = [];

async function main() {
  const envFile = new URL('../.env', import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
  const token = process.env.CHATBOT_HTTP_SMOKE_ACCESS_TOKEN?.trim();
  assert.ok(token, 'An existing Mindly test-account access token is required');
  const prefix = (process.env.API_PREFIX ?? 'api/v1').replace(/^\/+|\/+$/g, '');
  const url = new URL(process.env.CHATBOT_HTTP_SMOKE_URL
    ?? `http://127.0.0.1:${process.env.PORT ?? '8000'}/${prefix}/chatbot/messages`);
  assert.ok(url.protocol === 'https:' || (url.protocol === 'http:'
    && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)));
  assert.ok(!url.username && !url.password && !url.search && !url.hash);
  assert.ok(url.pathname.endsWith('/chatbot/messages'));

  const baselineUrl = new URL(url.href);
  baselineUrl.pathname = url.pathname.replace(/\/chatbot\/messages$/, '/learning-progress/my-courses');
  const readProgress = async () => {
    const response = await fetch(baselineUrl, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(45000),
    });
    httpStatus = response.status;
    assert.equal(response.status, 200);
    const body = await response.json() as { success: boolean; data: ICourseLearningProgress[] };
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    return body.data;
  };
  const send = async (message: string, context?: string) => {
    requests++;
    const response = await fetch(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...(context ? { context } : {}) }),
      signal: AbortSignal.timeout(45000), redirect: 'error',
    });
    httpStatus = response.status;
    assert.equal(response.status, 200);
    const body = await response.json() as { success: boolean; data: ChatbotMessageResponse };
    assert.equal(body.success, true);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-request-id'), body.data.requestId);
    assert.ok(body.data.context);
    return body.data;
  };
  stage = 'baseline';
  const before = await readProgress();
  assert.ok(before.length, 'Use a seed account that already owns a course');
  const byId = new Map(before.map((p) => [p.courseId, p]));
  const verifyCourse = (course: ChatbotOwnedCourse) => {
    const actual = byId.get(course.id);
    assert.ok(actual);
    for (const key of Object.keys(course.progress) as Array<keyof ChatbotOwnedCourse['progress']>) {
      assert.deepEqual(course.progress[key], actual[key]);
    }
    assert.ok([`/courses/${course.id}`, '/my-courses'].includes(course.url));
    if (course.resumeUrl) assert.equal(course.resumeUrl, `/courses/${course.id}/lessons/${course.progress.lastLessonId}`);
  };

  stage = 'owned_list';
  const first = await send('Cho tôi xem các khóa học đã mua, mỗi trang 2 khóa');
  assert.equal(first.kind, 'my_courses');
  if (first.kind !== 'my_courses') throw new Error('Expected owned courses');
  assert.equal(first.result.total, before.length);
  assert.equal(first.result.limit, 2);
  first.result.items.forEach(verifyCourse);
  checks.push('active_ownership_matches_learning_api');

  stage = 'position';
  const detail = await send('Xem tiến độ khóa thứ nhất', first.context);
  assert.ok(detail.kind === 'learning_progress' && detail.result.scope === 'course');
  if (detail.kind !== 'learning_progress' || detail.result.scope !== 'course') throw new Error('Expected course');
  assert.equal(detail.result.course.id, first.result.items[0].id);
  verifyCourse(detail.result.course);
  checks.push('position_and_shared_progress');

  stage = 'current_course';
  const current = await send('Khóa đó còn bao nhiêu bài?', detail.context);
  assert.ok(current.kind === 'learning_progress' && current.result.scope === 'course');
  if (current.kind !== 'learning_progress' || current.result.scope !== 'course') throw new Error('Expected current course');
  assert.equal(current.result.course.id, detail.result.course.id);
  assert.equal(current.result.remainingLessons, detail.result.course.progress.totalLessons - detail.result.course.progress.completedLessons);
  checks.push('current_course_and_remaining_lessons');

  stage = 'refinement';
  const refined = await send('Chỉ những khóa chưa bắt đầu', current.context);
  assert.equal(refined.kind, 'my_courses');
  if (refined.kind !== 'my_courses') throw new Error('Expected refined list');
  assert.deepEqual(refined.result.filtersApplied, { learningStatus: LearningStatusEnum.NOT_STARTED, page: 1, limit: 2 });
  assert.equal(refined.result.total, before.filter((p) => p.status === LearningStatusEnum.NOT_STARTED).length);
  refined.result.items.forEach(verifyCourse);
  checks.push('status_filter_before_pagination_and_originating_list');

  stage = 'overview';
  const overview = await send('Tổng quan tiến độ tất cả khóa học của tôi', refined.context);
  assert.ok(overview.kind === 'learning_progress' && overview.result.scope === 'overview');
  if (overview.kind !== 'learning_progress' || overview.result.scope !== 'overview') throw new Error('Expected overview');
  assert.deepEqual(overview.result, {
    scope: 'overview', totalCourses: before.length,
    notStarted: before.filter((p) => p.status === LearningStatusEnum.NOT_STARTED).length,
    inProgress: before.filter((p) => p.status === LearningStatusEnum.IN_PROGRESS).length,
    completed: before.filter((p) => p.status === LearningStatusEnum.COMPLETED).length,
  });
  checks.push('overview_matches_shared_progress');

  stage = 'read_only';
  const after = await readProgress();
  const stable = (data: ICourseLearningProgress[]) => [...data].sort((a, b) => a.courseId.localeCompare(b.courseId));
  assert.deepEqual(stable(after), stable(before));
  checks.push('no_learning_state_changes');
  console.log(JSON.stringify({ status: 'passed', requests, checks }));
}

await main().catch(() => {
  // Never print assertions, course facts, context, JWTs or response bodies.
  console.error(JSON.stringify({ status: 'failed', stage, httpStatus, requests, code: 'CHATBOT_LEARNING_SMOKE_FAILED' }));
  process.exitCode = 1;
});
