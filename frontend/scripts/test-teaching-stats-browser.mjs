import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// All API responses are intercepted. No login, payment or application-data writes.
const origin = process.env.TEACHING_STATS_PREVIEW_ORIGIN || 'http://localhost:3000';
const temp = process.env.TASTE_SKILL_TMP || join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
process.env.TASTE_SKILL_TMP = temp;
const out = join(temp, 'teaching-stats-browser');
mkdirSync(out, { recursive: true });
const user = {
  id: '607f1f77bcf86cd799439011', fullName: 'Giảng viên kiểm thử', email: 'instructor@example.test',
  role: 'instructor', status: 'active', isEmailVerified: true,
};
const course = {
  id: '607f1f77bcf86cd799439013', instructorId: user.id, title: 'Khóa học kiểm thử',
  status: 'PUBLISHED', price: 200000, totalRevenue: 200000, instructorEarnings: 140000, successfulSales: 1,
};
const overview = {
  totalRevenue: course.totalRevenue, instructorEarnings: course.instructorEarnings,
  successfulSales: course.successfulSales, averageRating: 0, totalReviews: 0,
};
const emptyList = { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
const reviewStats = {
  averageRating: 0, totalReviews: 0,
  distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percentage: 0 })),
};
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, arg) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await page.eval(predicate, arg)) return;
    await sleep(50);
  }
  throw new Error(`Timed out: ${label}`);
}

async function chooseRange(page, label) {
  await page.eval(() => document.querySelector('main [role="combobox"]').click());
  await waitFor(page, (label) =>
    [...document.querySelectorAll('[role="option"]')].some((item) => item.textContent.trim() === label),
  'report range menu', label);
  await page.eval((label) => [...document.querySelectorAll('[role="option"]')]
    .find((item) => item.textContent.trim() === label).click(), label);
}

async function fixture(width) {
  const page = await browser.newPage({ width, height: width < 600 ? 1000 : 1100, mobile: width < 600 });
  const state = { requests: [], writes: [], errors: [], success: false };
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken','teaching-stats-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    async function fulfill(data, status = 200, raw = false) {
      await page.send('Fetch.fulfillRequest', {
        requestId, responseCode: status,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
        ],
        body: status === 204 ? '' : Buffer.from(JSON.stringify(raw ? data : { success: true, data })).toString('base64'),
      });
    }
    try {
      if (request.method === 'OPTIONS') return await fulfill(null, 204);
      const url = new URL(request.url);
      const path = url.pathname.replace('/api/v1', '');
      state.requests.push({ path, params: Object.fromEntries(url.searchParams) });
      if (request.method !== 'GET') {
        state.writes.push(request.method);
        return await fulfill(null, 405);
      }
      if (path.startsWith('/instructor/teaching-stats/')) {
        if (!state.success) {
          return await fulfill({
            statusCode: 422, code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
            reason: url.searchParams.get('timeRange') === 'all' ? 'invalid_money' : 'missing_payment_date',
            message: 'Có đơn hàng thiếu dữ liệu thanh toán đã xác thực. Vui lòng liên hệ quản trị viên để đối soát.',
          }, 422, true);
        }
        return await fulfill(path.endsWith('/overview')
          ? overview : { ...emptyList, items: [course], total: 1 });
      }
      return await fulfill(path === '/auth/me' ? user
        : path === '/courses/my-courses' ? [course]
        : path === '/reviews/instructor/stats' ? reviewStats
        : path === '/reviews/instructor' ? emptyList : []);
    } catch (error) {
      state.errors.push(String(error));
      await fulfill(null, 500).catch(() => {});
    }
  });
  return { page, state, close: async () => { off(); await page.close(); } };
}

try {
  for (const width of [1440, 768, 390]) {
    const { page, state, close } = await fixture(width);
    try {
      await page.goto(`${origin}/instructor/statistics`, { timeoutMs: 60000, settleMs: 200 });
      const start = performance.now();
      await waitFor(page, () => document.querySelectorAll('main [role="alert"]').length === 2
        && document.querySelector('main [role="combobox"]').textContent.trim() === 'Hôm nay', 'initial today report errors');
      const todayErrorMs = Math.round(performance.now() - start);
      assert.ok(todayErrorMs < 1500, `Business error must not wait for retries (${todayErrorMs} ms)`);
      await sleep(3300); // Exceed both old retry delays to detect unwanted automatic requests.
      for (const endpoint of ['overview', 'courses']) {
        const requests = state.requests.filter((r) => r.path.endsWith(`/teaching-stats/${endpoint}`));
        assert.equal(requests.length, 1, 'Exactly one initial request per report endpoint');
        assert.equal(requests[0].params.timeRange, 'today', 'Initial report requests must default to today');
      }
      assert.equal(await page.eval(() => !!document.querySelector('[data-sonner-toast][data-type="success"]')), false);
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('Không tìm thấy khóa học nào')), false);
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('0đ')), false);
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.eval(() => [...document.querySelectorAll('main [role="alert"] button')].every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.height >= 32;
      })), true, 'Both retry buttons must fit without horizontal scrolling, including on a phone');
      await page.screenshot({ path: join(out, `errors-${width}.png`), format: 'png', fullPage: true });

      // Inspect the actual changed report blocks with their production stylesheet.
      const snapshot = await page.eval(() => {
        const head = [...document.querySelectorAll('link[rel="stylesheet"],style')]
          .map((node) => node.outerHTML).join('');
        const main = document.createElement('main');
        main.className = 'mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8';
        main.innerHTML = '<h1 class="text-2xl font-semibold">Thống kê giảng dạy</h1>'
          + document.querySelector('[aria-labelledby="section-overview-title"]').outerHTML
          + document.querySelector('[aria-labelledby="section-courses-revenue"]').outerHTML;
        return `<!doctype html><html lang="vi" class="${document.documentElement.className}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${location.origin}/">${head}</head>`
          + `<body class="${document.body.className}">${main.outerHTML}</body></html>`;
      });
      if (width === 1440) writeFileSync(join(out, 'report-errors.html'), snapshot);

      await chooseRange(page, 'Tất cả thời gian');
      await waitFor(page, () => document.querySelectorAll('main [role="alert"]').length === 2
        && document.querySelector('main [role="combobox"]').textContent.trim() === 'Tất cả thời gian', 'all-time report errors');
      for (const endpoint of ['overview', 'courses']) {
        assert.equal(state.requests.filter((r) => r.path.endsWith(`/teaching-stats/${endpoint}`)
          && r.params.timeRange === 'all').length, 1, 'All-time reports must still be selectable');
      }

      await chooseRange(page, 'Tùy chỉnh khoảng ngày');
      assert.equal(await page.eval(() => [...document.querySelectorAll('input[type="date"]')].every((input) => {
        const rect = input.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth;
      })), true, 'Both custom date controls must remain visible on tablets and phones');
      await page.eval(() => {
        for (const [label, value] of [['Từ ngày', '2026-11-01'], ['Đến ngày', '2026-11-22']]) {
          const input = document.querySelector(`input[aria-label="${label}"]`);
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.eval(() => [...document.querySelectorAll('main button')]
        .find((button) => button.textContent.trim() === 'Áp dụng').click());
      await waitFor(page, () => document.querySelectorAll('main [role="alert"]').length === 2, 'custom date errors');
      for (const endpoint of ['overview', 'courses']) {
        assert.equal(state.requests.filter((r) => r.path.endsWith(`/teaching-stats/${endpoint}`)
          && r.params.startDate === '2026-11-01' && r.params.endDate === '2026-11-22').length, 1);
      }

      state.success = true;
      await page.eval(() => document.querySelector('[aria-labelledby="section-overview-title"] [role="alert"] button').click());
      await waitFor(page, () => !document.querySelector('[aria-labelledby="section-overview-title"] [role="alert"]'), 'overview retry recovers');
      await page.eval(() => document.querySelector('[aria-labelledby="section-courses-revenue"] [role="alert"] button').click());
      await waitFor(page, () => !document.querySelector('main [role="alert"]')
        && document.querySelector('tbody').textContent.includes('Khóa học kiểm thử'), 'course retry recovers');
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(state.writes.length, 0);
      assert.deepEqual(state.errors, []);
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, todayErrorMs, automaticRequestsPerEndpoint: 1, retryRecovered: true, writes: 0 });
      await page.screenshot({ path: join(out, `recovered-${width}.png`), format: 'png', fullPage: true });
    } finally {
      await close();
    }
  }
  console.log(JSON.stringify({ origin, results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
