import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolveBusinessPeriod } from '../src/modules/chatbot/tools/instructor-business.period.js';
import type { ChatbotMessageResponse } from '../src/modules/chatbot/http/chatbot-response.projection.js';
import type { IInstructorCourseRevenue, ITeachingStatsOverview } from 'share-lib';

// Five independent date/course cases, supplementing the five-turn browser flow.
// Existing instructor JWT only. GET baselines + chatbot POST; no login or writes.
let stage = 'configuration';
let requests = 0;
let httpStatus: number | undefined;
async function main() {
  const envFile = new URL('../.env', import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
  const token = process.env.CHATBOT_HTTP_SMOKE_ACCESS_TOKEN?.trim();
  assert.ok(token);
  const prefix = (process.env.API_PREFIX ?? 'api/v1').replace(/^\/+|\/+$/g, '');
  const endpoint = new URL(process.env.CHATBOT_HTTP_SMOKE_URL
    ?? `http://127.0.0.1:${process.env.PORT ?? '8000'}/${prefix}/chatbot/messages`);
  assert.ok(endpoint.protocol === 'https:' || (endpoint.protocol === 'http:'
    && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)));
  assert.ok(!endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash);
  assert.ok(endpoint.pathname.endsWith('/chatbot/messages'));
  const api = new URL(endpoint.href.replace(/chatbot\/messages$/, ''));
  const get = async <T>(path: string, query: Record<string, string>) => {
    const url = new URL(path, api);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` },
      redirect: 'error', signal: AbortSignal.timeout(45000) });
    httpStatus = response.status;
    assert.equal(response.status, 200);
    const body = await response.json() as { success: boolean; data: T };
    assert.equal(body.success, true);
    return body.data;
  };
  const send = async (message: string) => {
    requests++;
    const response = await fetch(endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }), redirect: 'error', signal: AbortSignal.timeout(45000),
    });
    httpStatus = response.status;
    assert.equal(response.status, 200);
    const body = await response.json() as { success: boolean; data: ChatbotMessageResponse };
    assert.equal(body.success, true);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return body.data;
  };
  const now = new Date();
  const month = resolveBusinessPeriod({ timeRange: 'this_month' }, now);
  const custom = { startDate: month.startDate,
    endDate: `${month.endDate.slice(0, 8)}${String(Math.min(Number(month.endDate.slice(8)), 20)).padStart(2, '0')}` };
  const overview = (query: Record<string, string>) => get<ITeachingStatsOverview>('instructor/teaching-stats/overview', query);
  stage = 'baseline';
  const before = await overview({ timeRange: 'this_month' });
  const courses = await get<{ items: IInstructorCourseRevenue[] }>('instructor/teaching-stats/courses',
    { timeRange: 'this_month', page: '1', limit: '1', sort: 'earnings_desc' });
  assert.ok(courses.items.length, 'Use an existing instructor test account with a taught course');
  const compareTotals = (actual: { totalRevenue: number; instructorEarnings: number; successfulSales: number }, expected: ITeachingStatsOverview | IInstructorCourseRevenue) => {
    for (const key of ['totalRevenue', 'instructorEarnings', 'successfulSales'] as const) assert.equal(actual[key], expected[key]);
  };
  const checks: string[] = [];
  for (const test of [
    { name: 'custom_dates', input: { timeRange: 'custom' as const, ...custom },
      message: `Tôi kiếm được bao nhiêu tiền từ ngày ${custom.startDate} đến ${custom.endDate}?` },
    { name: 'last_seven_calendar_days', input: { timeRange: '7days' as const }, message: 'Doanh thu 7 ngày gần nhất của tôi?' },
    { name: 'today', input: { timeRange: 'today' as const }, message: 'Doanh thu hôm nay của tôi?' },
    { name: 'weekly_successful_purchases', input: { timeRange: 'this_week' as const }, message: 'Tuần này có bao nhiêu lượt mua thành công khóa học của tôi?' },
  ]) {
    stage = test.name;
    const period = resolveBusinessPeriod(test.input, now);
    const expected = await overview({ timeRange: 'custom', startDate: period.startDate, endDate: period.endDate });
    const reply = await send(test.message);
    assert.ok(reply.kind === 'instructor_revenue' || reply.kind === 'instructor_sales_stats');
    if (reply.kind !== 'instructor_revenue' && reply.kind !== 'instructor_sales_stats') throw new Error('Expected instructor response');
    assert.equal(reply.result.scope, test.name === 'weekly_successful_purchases' ? 'sales_count' : 'revenue');
    assert.equal(reply.result.period.startDate, period.startDate);
    assert.equal(reply.result.period.endDate, period.endDate);
    assert.equal(reply.result.course, null);
    if (reply.result.scope !== 'revenue' && reply.result.scope !== 'sales_count') throw new Error('Expected totals');
    compareTotals(reply.result.totals, expected);
    checks.push(test.name);
  }
  stage = 'one_taught_course';
  const course = courses.items[0];
  const reply = await send(`Doanh thu khóa /courses/${course.id} tháng này của tôi?`);
  assert.ok(reply.kind === 'instructor_revenue' && reply.result.scope === 'revenue');
  if (reply.kind !== 'instructor_revenue' || reply.result.scope !== 'revenue') throw new Error('Expected course revenue');
  assert.equal(reply.result.course?.id, course.id);
  compareTotals(reply.result.totals, course);
  checks.push('one_taught_course');
  stage = 'read_only';
  assert.deepEqual(await overview({ timeRange: 'this_month' }), before);
  checks.push('teaching_statistics_unchanged');
  assert.equal(requests, 5);
  console.log(JSON.stringify({ status: 'passed', requests, checks }));
}
await main().catch(() => {
  // Assertions may contain financial facts: never print bodies, assertion diffs or JWTs.
  console.error(JSON.stringify({ status: 'failed', stage, requests, httpStatus, code: 'CHATBOT_INSTRUCTOR_SMOKE_FAILED' }));
  process.exitCode = 1;
});
