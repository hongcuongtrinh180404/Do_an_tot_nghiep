import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Default: real browser + API fixtures, no provider calls or business writes.
// --live: exactly five real chat requests with an existing seed account token.
const live = process.argv.includes('--live');
const learning = process.argv.includes('--learning');
assert.ok(process.argv.slice(2).every((arg) => ['--live', '--learning'].includes(arg)));
if (live) assert.ok(process.env.CHATBOT_BROWSER_ACCESS_TOKEN, 'An existing access token is required');
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'chatbot-conversation-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.CHATBOT_TEST_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const viewer = {
  id: '0123456789abcdef01234567', username: 'chatbot-fixture-a',
  fullName: 'Học viên kiểm thử', email: 'chatbot-fixture@example.test',
  role: 'student', status: 'active', isEmailVerified: true, avatarUrl: null,
};
const filters = {
  keyword: 'backend', relatedKeywords: ['NestJS'], maxPrice: 200000,
  maxPriceExclusive: true, page: 1, limit: 2,
};
function reply(context, { page = 1, start = 1, free = false, level = 'intermediate' } = {}) {
  return {
    requestId: '65ac3483-7075-48e3-8bbe-4c3a6eb9cced',
    status: 'found', answer: 'Kết quả từ catalog kiểm thử.', context,
    result: {
      filtersApplied: { ...filters, page, ...(free ? { isFree: true } : {}), level },
      items: [start, start + 1].map((index) => {
        const id = index.toString(16).padStart(24, '0');
        return {
          id, title: `Khóa backend kiểm thử ${index}`, level, categoryName: 'Lập trình',
          price: free ? 0 : 50000 + index * 1000, url: `/courses/${id}`,
        };
      }),
      total: 4, page, limit: 2, hasMore: page === 1, currency: 'VND',
    },
  };
}
function ownedReply(context) {
  const id = '0123456789abcdef01234567';
  const lessonId = '0123456789abcdef01234568';
  return {
    requestId: reply('').requestId, kind: 'my_courses', status: 'found', answer: 'Khóa học của bạn.', context,
    result: {
      filtersApplied: { page: 1, limit: 5 }, page: 1, limit: 5, hasMore: false, total: 1,
      items: [{
        id, title: 'Python thực hành — từ nền tảng đến ứng dụng', enrolledAt: '2026-11-20T00:00:00.000Z',
        url: `/courses/${id}`, resumeUrl: `/courses/${id}/lessons/${lessonId}`,
        progress: { status: 'IN_PROGRESS', completedLessons: 8, totalLessons: 20, progressPercent: 40,
          watchedMs: 7200000, lastLessonId: lessonId, lastPositionSeconds: 85 },
      }],
    },
  };
}
function progressReply(context) {
  return {
    requestId: reply('').requestId, kind: 'learning_progress', status: 'found', answer: 'Tiến độ của bạn.', context,
    result: { scope: 'course', course: ownedReply('').result.items[0], remainingLessons: 12, lastLessonTitle: 'Vòng lặp và điều kiện' },
  };
}
const browser = await Browser.launch();
const checks = [];
const requestErrors = [];
const liveResponses = [];
let activePage;
const mark = (name) => { checks.push(name); console.log('PASS', name); };
async function waitFor(predicate, message, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await sleep(100);
  }
  throw new Error(message);
}
const panelText = () => document.querySelector('[data-chatbot-panel]')?.textContent ?? '';
async function openWidget(page) {
  await waitFor(() => page.eval(() => !!document.querySelector('[data-chatbot-launcher]')), 'Launcher missing');
  for (let attempt = 0; attempt < 10; attempt++) {
    if (!await page.eval(() => !!document.querySelector('[data-chatbot-panel]'))) {
      await page.eval(() => document.querySelector('[data-chatbot-launcher]')?.click());
    }
    await sleep(300);
    if (await page.eval(() => !!document.querySelector('#mindly-chatbot-message'))) return;
  }
  throw new Error('Authenticated composer missing');
}
async function snapshot(page, name) {
  assert.equal(page.consoleErrors.length, 0, `${name}: unexpected browser exception`);
  // Hide unrelated development overlays, never application controls.
  await page.eval(() => {
    document.querySelectorAll('.tsqd-open-btn-container, nextjs-portal').forEach((node) => node.remove());
  });
  await page.screenshot({ path: join(out, `${name}.png`), format: 'png' });
}
async function inspectPanel(page) {
  const findings = await page.eval(() => {
    const panel = document.querySelector('[data-chatbot-panel]');
    const errors = [];
    const bounds = panel.getBoundingClientRect();
    if (bounds.left < 0 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1) errors.push('Panel outside viewport');
    for (const element of panel.querySelectorAll('[data-chatbot-personal], button, a, [role="progressbar"]')) {
      const rect = element.getBoundingClientRect();
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) errors.push('Content overflow');
      if (['BUTTON', 'A'].includes(element.tagName) && rect.height < 43) errors.push('Small touch target');
    }
    for (const bar of panel.querySelectorAll('[role="progressbar"]')) {
      const actual = bar.firstElementChild.getBoundingClientRect().width / bar.getBoundingClientRect().width * 100;
      if (Math.abs(actual - Number(bar.getAttribute('aria-valuenow'))) > 1) errors.push('Inaccurate progress bar');
    }
    return errors;
  });
  assert.deepEqual(findings, []);
}
async function open(width) {
  const page = await browser.newPage({
    width, height: width < 640 ? 844 : 900, mobile: width < 640, reducedMotion: true,
  });
  activePage = page;
  const state = { viewer, calls: [], queue: [], held: null, responses: [], failures: [], writes: [] };
  const accessToken = live ? process.env.CHATBOT_BROWSER_ACCESS_TOKEN : 'chatbot-conversation-fixture';
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.clear();sessionStorage.clear();localStorage.setItem('accessToken',${JSON.stringify(accessToken)});`,
  });
  await page.send('Network.enable');
  const chatResponses = new Map();
  browser.on(page.sessionId, 'Network.requestWillBeSent', ({ request }) => {
    if (new URL(request.url).pathname.endsWith('/api/v1/chatbot/messages') && request.method === 'POST') {
      state.calls.push(JSON.parse(request.postData));
    }
  });
  browser.on(page.sessionId, 'Network.responseReceived', ({ requestId, response }) => {
    if (response.status >= 400 && new URL(response.url).pathname.includes('/api/v1/')) {
      requestErrors.push({ status: response.status, path: new URL(response.url).pathname });
    }
    if (new URL(response.url).pathname.endsWith('/api/v1/chatbot/messages') && response.status !== 204) {
      const header = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'x-ratelimit-remaining');
      chatResponses.set(requestId, { status: response.status, remaining: header ? Number(header[1]) : undefined });
    }
  });
  browser.on(page.sessionId, 'Network.loadingFinished', async ({ requestId }) => {
    if (!chatResponses.has(requestId)) return;
    try {
      const response = await page.send('Network.getResponseBody', { requestId });
      const text = response.base64Encoded ? Buffer.from(response.body, 'base64').toString('utf8') : response.body;
      const body = JSON.parse(text);
      const { status, remaining } = chatResponses.get(requestId);
      state.responses.push({ status, body, remaining });
      if (live) liveResponses.push({
        httpStatus: status, remaining, replyStatus: body.data?.status,
        ...(typeof body.code === 'string' && /^CHATBOT_[A-Z_]{1,64}$/.test(body.code) ? { code: body.code } : {}),
      });
    } catch { state.failures.push('Could not inspect completed chatbot response'); }
  });
  if (!live) {
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      try {
        const path = new URL(request.url).pathname;
        const headers = [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: request.headers.Origin ?? origin },
          { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Expose-Headers', value: 'retry-after,x-ratelimit-remaining,x-ratelimit-reset' },
        ];
        const fulfill = (status, body) => page.send('Fetch.fulfillRequest', {
          requestId, responseCode: status, responseHeaders: headers,
          body: status === 204 ? '' : Buffer.from(JSON.stringify(body)).toString('base64'),
        });
        if (request.method === 'OPTIONS') return await fulfill(204, null);
        if (path.endsWith('/auth/me')) return await fulfill(200, { success: true, data: state.viewer });
        // The shared public header also reads this private endpoint. A fake JWT
        // must never reach the real API and accidentally trigger its 401 cleanup.
        if (path.endsWith('/instructor-applications/my-application')) {
          return await fulfill(200, { success: true, data: null });
        }
        if (path.endsWith('/enrollments/my-courses')) {
          return await fulfill(200, { success: true, data: [] });
        }
        if (path.endsWith('/chatbot/messages')) {
          const next = state.queue.shift();
          if (!next) throw new Error('Unexpected chatbot request');
          if (next.hold) { state.held = fulfill; return; }
          return await fulfill(next.status ?? 200, next.status
            ? next.body : { success: true, data: next.body });
        }
        if (!['GET', 'HEAD'].includes(request.method)) {
          state.writes.push(path);
          return await fulfill(405, {});
        }
        await page.send('Fetch.continueRequest', { requestId });
      } catch { state.failures.push('Fixture request failed'); }
    });
  }
  await page.goto(`${origin}/`, { timeoutMs: 45000, settleMs: 1200 });
  await openWidget(page);
  return { page, state };
}
async function ask(page, state, message, pending = false) {
  const calls = state.calls.length;
  const completed = state.responses.length;
  await page.eval(() => {
    const input = document.querySelector('#mindly-chatbot-message');
    input.focus(); input.select();
  });
  await page.send('Input.insertText', { text: message });
  await page.eval(() => {
    const send = document.querySelector('button[aria-label="Gửi câu hỏi"]');
    if (!send || send.disabled) throw new Error('Send unexpectedly disabled');
    send.click();
  });
  await waitFor(() => state.calls.length === calls + 1, 'Chat request not sent');
  if (pending) return;
  await waitFor(() => state.responses.length === completed + 1, 'Chat response did not finish', 50000);
  await waitFor(() => page.eval(() =>
    !document.querySelector('[data-chatbot-panel] [role="log"] [role="status"]')), 'Pending UI did not settle');
  if (live) assert.equal(state.responses.at(-1).status, 200, 'Live chatbot returned an HTTP error');
}
async function clear(page) {
  await page.eval(() => document.querySelector('button[aria-label="Xóa cuộc trò chuyện tạm"]').click());
  await waitFor(() => page.eval(() =>
    document.querySelector('[data-chatbot-panel]')?.textContent.includes('Bạn muốn học gì?')), 'Transcript not cleared');
}
function latest(state) { return state.calls.at(-1); }

try {
  if (live && learning) {
    const { page, state } = await open(1440);
    await ask(page, state, 'Cho tôi xem các khóa học đã mua, mỗi trang 2 khóa');
    const first = state.responses.at(-1).body.data;
    assert.ok(state.responses.at(-1).remaining >= 4, 'Insufficient quota for five requests');
    assert.equal(first.kind, 'my_courses');
    assert.ok(first.result.items.length);
    await snapshot(page, 'learning-live-courses');
    await ask(page, state, 'Tiến độ khóa thứ nhất');
    const detail = state.responses.at(-1).body.data;
    assert.equal(detail.result.scope, 'course');
    assert.equal(detail.result.course.id, first.result.items[0].id);
    assert.equal(latest(state).context, first.context);
    await inspectPanel(page);
    await snapshot(page, 'learning-live-detail');
    mark('live-learning-owned-to-detail');
    await ask(page, state, 'Khóa đó còn bao nhiêu bài?');
    assert.equal(state.responses.at(-1).body.data.result.course.id, first.result.items[0].id);
    mark('live-learning-current-course');
    await ask(page, state, 'Tổng quan tiến độ tất cả khóa học của tôi');
    const overview = state.responses.at(-1).body.data;
    assert.equal(overview.result.scope, 'overview');
    assert.equal(overview.result.totalCourses, overview.result.notStarted + overview.result.inProgress + overview.result.completed);
    await snapshot(page, 'learning-live-overview');
    mark('live-learning-overview');
    await clear(page);
    await ask(page, state, 'Tiến độ khóa thứ hai');
    assert.ok(!('context' in latest(state)));
    assert.equal(state.responses.at(-1).body.data.status, 'needs_clarification');
    assert.equal(state.calls.length, 5);
    assert.deepEqual(state.failures, []);
    mark('live-learning-clear-drops-reference');
    await page.close();
  } else if (learning) {
    for (const width of [1440, 768, 390]) {
      const { page, state } = await open(width);
      state.queue.push({ body: ownedReply('owned-context') });
      await ask(page, state, 'Các khóa của tôi');
      await inspectPanel(page);
      await snapshot(page, `learning-courses-${width}`);
      state.queue.push({ body: progressReply('detail-context') });
      const completed = state.responses.length;
      await page.eval(() => [...document.querySelectorAll('[data-chatbot-personal="courses"] button')].at(-1).click());
      await waitFor(() => state.responses.length === completed + 1, 'Selection did not complete');
      await waitFor(() => page.eval(() => !!document.querySelector('[data-chatbot-personal="detail"]')), 'Detail missing');
      assert.equal(latest(state).context, 'owned-context');
      assert.equal(latest(state).message, 'Xem tiến độ khóa thứ 1');
      assert.ok(await page.eval(() => document.querySelector('[data-chatbot-personal="courses"] button').disabled));
      await inspectPanel(page);
      await snapshot(page, `learning-detail-${width}`);
      mark(`learning-selection-detail-and-historical-controls-${width}`);
      state.queue.push({ body: {
        requestId: reply('').requestId, kind: 'learning_progress', status: 'needs_clarification', answer: 'Chọn khóa.',
        context: 'selection-context', result: { scope: 'selection', keyword: 'Python', items: [
          { id: '0123456789abcdef01234567', title: 'Python cơ bản' },
          { id: '0123456789abcdef01234569', title: 'Python ứng dụng' },
        ], total: 2, page: 1, limit: 5, hasMore: false },
      } });
      await ask(page, state, 'Tiến độ Python');
      await inspectPanel(page);
      await snapshot(page, `learning-ambiguous-${width}`);
      state.queue.push({ body: {
        requestId: reply('').requestId, kind: 'learning_progress', status: 'found', answer: 'Tổng quan.',
        context: 'overview-context', result: { scope: 'overview', totalCourses: 4, notStarted: 1, inProgress: 2, completed: 1 },
      } });
      await ask(page, state, 'Tổng quan tiến độ của tôi');
      await inspectPanel(page);
      await snapshot(page, `learning-overview-${width}`);
      mark(`learning-ambiguous-and-overview-${width}`);
      await clear(page);
      state.queue.push({ body: { requestId: reply('').requestId, kind: 'clarification',
        status: 'needs_clarification', answer: 'Bạn muốn xem tiến độ khóa nào?' } });
      await ask(page, state, 'Khóa đó');
      assert.ok(!('context' in latest(state)));
      assert.deepEqual(state.writes, []);
      assert.deepEqual(state.failures, []);
      mark(`learning-clear-and-read-only-${width}`);
      await page.close();
    }
  } else if (live) {
    const { page, state } = await open(1440);
    await ask(page, state, 'Tìm khóa backend trả phí dưới 200k');
    const first = state.responses.at(-1).body.data;
    assert.ok(state.responses.at(-1).remaining >= 4, 'Not enough account quota for this five-request check; do not retry automatically');
    assert.equal(first.status, 'found');
    assert.ok(first.context && first.result.items.length);
    const minimum = Math.min(...first.result.items.map((item) => item.price));
    assert.ok(minimum > 0);
    await ask(page, state, 'Rẻ hơn');
    const cheaper = state.responses.at(-1).body.data;
    assert.equal(latest(state).context, first.context);
    assert.equal(cheaper.result.filtersApplied.maxPrice, minimum);
    assert.equal(cheaper.result.filtersApplied.maxPriceExclusive, true);
    assert.ok(cheaper.result.items.every((item) => item.price < minimum));
    mark('live-cheaper-uses-actual-price');
    await snapshot(page, 'live-cheaper');

    await ask(page, state, 'Tìm khóa Yoga');
    const yoga = state.responses.at(-1).body.data;
    assert.equal(yoga.result.filtersApplied.keyword.toLowerCase(), 'yoga');
    assert.ok(!('maxPrice' in yoga.result.filtersApplied) && !('isFree' in yoga.result.filtersApplied));
    mark('live-new-topic-resets-filters');
    await clear(page);
    await ask(page, state, 'Xem thêm');
    assert.ok(!('context' in latest(state)));
    assert.equal(state.responses.at(-1).body.data.status, 'needs_clarification');
    mark('live-clear-drops-context');
    await ask(page, state, 'Tìm khóa Python cho người mới');
    assert.ok(!('context' in latest(state)));
    assert.equal(state.responses.at(-1).body.data.status, 'found');
    await snapshot(page, 'live-fresh-search-after-clear');
    assert.equal(state.calls.length, 5);
    assert.ok(state.responses.every((response) => response.status === 200));
    assert.deepEqual(state.failures, []);
    mark('live-fresh-search-and-quota-safe');
    await page.close();
  } else {
    for (const width of [1440, 390]) {
      const { page, state } = await open(width);
      const ctx = (index) => `fixture-context-${width}-${index}`;
      state.queue.push({ body: reply(ctx(1)) });
      await ask(page, state, 'Backend dưới 200k');
      assert.ok(!('context' in latest(state)));
      state.queue.push({ body: reply(ctx(2), { page: 2, start: 3 }) });
      await ask(page, state, 'Xem thêm');
      assert.equal(latest(state).context, ctx(1));
      assert.ok((await page.eval(panelText)).includes('Trang 2'));
      await snapshot(page, `conversation-page-two-${width}`);
      mark(`context-chaining-and-page-two-${width}`);

      state.queue.push({ body: reply(ctx(3), { level: 'beginner' }) });
      await ask(page, state, 'Chỉ dành cho người mới');
      assert.equal(latest(state).context, ctx(2));
      state.queue.push({ body: reply(ctx(4), { level: 'beginner', free: true }) });
      await ask(page, state, 'Có khóa miễn phí không?');
      assert.equal(latest(state).context, ctx(3));
      assert.ok((await page.eval(panelText)).includes('Miễn phí'));
      await snapshot(page, `conversation-free-${width}`);
      mark(`beginner-free-follow-ups-${width}`);

      state.queue.push({ body: {
        requestId: reply('').requestId, status: 'needs_clarification', answer: 'Bạn đã xem hết kết quả.',
      } });
      await ask(page, state, 'Xem thêm');
      state.queue.push({ body: reply(ctx(5)) });
      await ask(page, state, 'Chỉ khóa trả phí');
      assert.equal(latest(state).context, ctx(4));
      mark(`clarification-preserves-context-${width}`);

      state.queue.push({ status: 400, body: { code: 'CHATBOT_CONTEXT_INVALID', statusCode: 400 } });
      await ask(page, state, 'Xem thêm');
      assert.ok((await page.eval(panelText)).includes('Ngữ cảnh tìm kiếm đã hết hạn'));
      assert.equal(await page.eval(() => !!localStorage.getItem('accessToken')), true);
      state.queue.push({ body: reply(ctx(6)) });
      await ask(page, state, 'Backend dưới 200k');
      assert.ok(!('context' in latest(state)));
      mark(`expired-context-does-not-log-out-${width}`);

      state.queue.push({ hold: true });
      await ask(page, state, 'Câu hỏi đang chờ', true);
      await waitFor(() => !!state.held, 'Fixture request not held');
      await clear(page);
      state.queue.push({ body: reply(ctx(7)) });
      await ask(page, state, 'Python');
      assert.ok(!('context' in latest(state)));
      // An aborted interception can already be gone; either way its reply must not revive context.
      await state.held(200, { success: true, data: reply('late-aborted-context') }).catch(() => {});
      state.queue.push({ body: reply(ctx(8)) });
      await ask(page, state, 'Xem thêm');
      assert.equal(latest(state).context, ctx(7));
      assert.ok(!(await page.eval(panelText)).includes('Câu hỏi đang chờ'));
      mark(`clear-cancels-and-ignores-late-result-${width}`);

      state.viewer = { ...viewer, id: '0123456789abcdef01234568', username: 'chatbot-fixture-b' };
      await page.eval((user) => {
        localStorage.setItem('accessToken', 'chatbot-fixture-account-b');
        localStorage.setItem('user', JSON.stringify(user));
        const channel = new BroadcastChannel('app_auth_sync');
        channel.postMessage({ type: 'AUTH_USER_SWITCHED', senderId: 'fixture-another-tab' });
        channel.close();
      }, state.viewer);
      await waitFor(() => page.eval(() => !document.querySelector('[data-chatbot-panel]')), 'Account switch did not reset dialog');
      await openWidget(page);
      state.queue.push({ body: reply(ctx(9)) });
      await ask(page, state, 'Backend cho tài khoản mới');
      assert.ok(!('context' in latest(state)));
      const persisted = await page.eval(() =>
        [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
          typeof value === 'string' && value.includes('fixture-context-')));
      assert.equal(persisted, false);
      assert.deepEqual(state.failures, []);
      assert.deepEqual(state.writes, []);
      mark(`account-isolation-and-no-context-storage-${width}`);
      await page.close();
    }
  }
  console.log(JSON.stringify({ status: 'passed', mode: live ? 'live' : 'fixtures', checks: checks.length, screenshots: out }));
} catch (error) {
  if (activePage) {
    try { await snapshot(activePage, live ? 'live-failure' : 'fixture-failure'); } catch {}
  }
  console.error(JSON.stringify({
    status: 'failed', mode: live ? 'live' : 'fixtures', completedChecks: checks,
    error: error.name,
    location: error.stack?.split('\n').find((line) => line.includes('at ') && line.includes('test-chatbot-conversation-browser.mjs:')),
    ...(live ? { responses: liveResponses } : {}),
    ...(!live ? { reason: error.message, requestErrors } : {}),
  }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
