import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Read-only UI verification. Auth and chatbot responses are browser fixtures;
// no account, quota, course or enrollment is touched.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'chatbot-visual-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.CHATBOT_TEST_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const courseId = '05527290862543249ad23ee4';

const viewer = {
  id: '6af4746db314082845d9ddd9',
  email: 'student4@thc.edu.vn',
  fullName: 'Hoàng Văn Nam',
  username: 'student4',
  avatarUrl: null,
  bio: null,
  role: 'student',
  status: 'active',
  isEmailVerified: true,
  hasPassword: true,
  provider: 'LOCAL',
};
const foundReply = {
  requestId: '65ac3483-7075-48e3-8bbe-4c3a6eb9cced',
  status: 'found',
  answer: 'Tìm thấy 2 khóa học công khai phù hợp.',
  result: {
    filtersApplied: { keyword: 'React', maxPriceExclusive: true, maxPrice: 500000, page: 1, limit: 5 },
    items: [
      {
        id: '05527290862543249ad23ee4', title: 'Xây dựng ứng dụng React', price: 3000,
        level: 'intermediate', categoryName: 'Lập trình', url: '/courses/05527290862543249ad23ee4',
      },
      {
        id: '77b9cd9815111ed2df8429c2', title: 'HTML & CSS thực chiến', price: 2000,
        level: 'beginner', categoryName: 'Thiết kế web', url: '/courses/77b9cd9815111ed2df8429c2',
      },
    ],
    currency: 'VND', total: 2, page: 1, limit: 5, hasMore: false,
  },
};

let mode = 'found';
const chatbotCalls = [];

function cors(origin) {
  return [
    { name: 'Access-Control-Allow-Origin', value: origin },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
    { name: 'Access-Control-Expose-Headers', value: 'x-request-id,retry-after,x-ratelimit-remaining,x-ratelimit-reset' },
    { name: 'Access-Control-Max-Age', value: '600' },
  ];
}

const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, message, tries = 300) {
  for (let index = 0; index < tries; index++) {
    if (await page.eval(predicate)) return;
    await sleep(100);
  }
  throw new Error(message);
}

async function open(path, width) {
  const page = await browser.newPage({
    width, height: width < 640 ? 844 : 900, mobile: width < 640, reducedMotion: true,
  });
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.clear();localStorage.setItem('accessToken','chatbot-visual-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(viewer))});`,
  });
  await page.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*://*/api/v1/auth/me*' },
      { urlPattern: '*://*/api/v1/chatbot/messages*' },
    ],
  });
  browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const url = new URL(request.url);
    const headers = cors(request.headers.Origin ?? origin);
    const fulfill = (code, data, extra = []) => page.send('Fetch.fulfillRequest', {
      requestId,
      responseCode: code,
      responseHeaders: [...headers, { name: 'Content-Type', value: 'application/json' }, ...extra],
      body: Buffer.from(JSON.stringify(data)).toString('base64'),
    });
    if (request.method === 'OPTIONS') {
      await page.send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: headers, body: '' });
      return;
    }
    if (url.pathname.endsWith('/auth/me')) {
      await fulfill(200, { success: true, data: viewer });
      return;
    }
    chatbotCalls.push({ mode, method: request.method, path: url.pathname });
    if (mode === 'error') {
      await fulfill(503, {
        statusCode: 503, code: 'CHATBOT_SEARCH_UNAVAILABLE',
        message: 'Trợ lý tìm khóa học đang bận.',
        retryable: true, requestId: '65ac3483-7075-48e3-8bbe-4c3a6eb9cced',
      });
      return;
    }
    const extra = mode === 'cooldown'
      ? [{ name: 'x-ratelimit-remaining', value: '0' }, { name: 'x-ratelimit-reset', value: '8' }]
      : [];
    await fulfill(200, { success: true, data: foundReply, timestamp: new Date().toISOString() }, extra);
  });
  await page.goto(`${origin}${path}`, { timeoutMs: 45000, settleMs: 1200 });
  return page;
}

async function openWidget(page) {
  await waitFor(page, () => !!document.querySelector('[data-chatbot-launcher]'), 'Chatbot launcher did not render');
  await sleep(300);
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.eval(() => document.querySelector('[data-chatbot-launcher]')?.click());
    await sleep(300);
    if (await page.eval(() => !!document.querySelector('[data-chatbot-panel]'))) return;
  }
  throw new Error('Chatbot panel did not open');
}

async function ask(page) {
  await page.eval(() => {
    const button = [...document.querySelectorAll('[data-chatbot-panel] button')]
      .find((item) => item.textContent.includes('Tìm khóa Python'));
    button.click();
  });
}

async function snapshot(page, name) {
  assert.equal(page.consoleErrors.length, 0, `${name}: browser errors: ${page.consoleErrors.join(', ')}`);
  // Remove unrelated Chrome-extension and Next.js dev overlays from review shots.
  await page.eval(() => {
    document.querySelectorAll('.tsqd-open-btn-container, nextjs-portal').forEach((node) => node.remove());
  });
  await page.screenshot({ path: join(out, `${name}.png`), format: 'png' });
  results.push({ name, status: 'PASS' });
  console.log('PASS', name);
}

try {
  // Desktop panel, results layout and floating position.
  mode = 'found';
  const desktop = await open('/', 1440);
  await openWidget(desktop);
  await waitFor(desktop, () => document.querySelector('[data-chatbot-panel]')?.textContent.includes('Bạn muốn học gì?'), 'Intro missing');
  const geometry = await desktop.eval(() => {
    const rect = document.querySelector('[data-chatbot-panel]').getBoundingClientRect();
    return { width: rect.width, right: innerWidth - rect.right, bottom: innerHeight - rect.bottom };
  });
  assert.ok(Math.abs(geometry.width - 420) <= 1, `desktop width ${geometry.width}`);
  assert.ok(Math.abs(geometry.right - 24) <= 1, `desktop right ${geometry.right}`);
  assert.ok(Math.abs(geometry.bottom - 24) <= 1, `desktop bottom ${geometry.bottom}`);
  await snapshot(desktop, 'chatbot-desktop-intro');

  await ask(desktop);
  await waitFor(desktop, () => document.querySelectorAll('[data-chatbot-panel] ul[aria-label="Khóa học tìm được"] a').length === 2, 'Course cards missing');
  const cards = await desktop.eval(() => [...document.querySelectorAll('[data-chatbot-panel] ul[aria-label="Khóa học tìm được"] a')]
    .map((link) => ({ href: link.getAttribute('href'), text: link.textContent })));
  assert.deepEqual(cards.map((card) => card.href), foundReply.result.items.map((item) => item.url));
  assert.ok(cards[0].text.includes('Xây dựng ứng dụng React'));
  assert.equal(await desktop.eval(() => {
    const panel = document.querySelector('[data-chatbot-panel]');
    return panel.scrollWidth > panel.clientWidth;
  }), false);
  await snapshot(desktop, 'chatbot-desktop-results');

  // Provider/database failure state with explicit retry.
  mode = 'error';
  const failure = await open('/', 1440);
  await openWidget(failure);
  await ask(failure);
  await waitFor(failure, () => !!document.querySelector('[data-chatbot-panel] [role="alert"]'), 'Error state missing');
  assert.ok((await failure.eval(() => document.querySelector('[data-chatbot-panel] [role="alert"]').textContent)).includes('tạm thời không khả dụng'));
  assert.ok((await failure.eval(() => document.querySelector('[data-chatbot-panel]').textContent)).includes('Thử lại câu hỏi'));
  await snapshot(failure, 'chatbot-desktop-error');
  await failure.close();

  // Local quota countdown from the server headers.
  mode = 'cooldown';
  const cooldown = await open('/', 1440);
  await openWidget(cooldown);
  await ask(cooldown);
  await waitFor(cooldown, () => document.querySelector('[data-chatbot-panel]')?.textContent.includes('Có thể gửi lại sau'), 'Cooldown missing');
  assert.match(await cooldown.eval(() => document.querySelector('[data-chatbot-panel]').textContent), /Có thể gửi lại sau\s*8 giây/);
  assert.equal(await cooldown.eval(() => document.querySelector('button[aria-label="Gửi câu hỏi"]').disabled), true);
  await snapshot(cooldown, 'chatbot-desktop-cooldown');
  await cooldown.close();

  // Mobile is a fullscreen dialog with a backdrop.
  mode = 'found';
  const mobile = await open('/', 390);
  await openWidget(mobile);
  await ask(mobile);
  await waitFor(mobile, () => document.querySelectorAll('[data-chatbot-panel] ul[aria-label="Khóa học tìm được"] a').length === 2, 'Mobile cards missing');
  const mobileGeometry = await mobile.eval(() => {
    const rect = document.querySelector('[data-chatbot-panel]').getBoundingClientRect();
    return {
      width: rect.width, height: rect.height, top: rect.top, left: rect.left,
      backdrop: !!document.querySelector('[class*="backdrop"]'),
      scrollX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.equal(mobileGeometry.width, 390);
  assert.ok(Math.abs(mobileGeometry.height - 844) <= 1, `mobile height ${mobileGeometry.height}`);
  assert.equal(mobileGeometry.top, 0);
  assert.equal(mobileGeometry.left, 0);
  assert.equal(mobileGeometry.backdrop, true);
  assert.equal(mobileGeometry.scrollX, false);
  await snapshot(mobile, 'chatbot-mobile-results');
  await mobile.close();

  // Course detail keeps the launcher above the mobile purchase bar.
  const detail = await open(`/courses/${courseId}`, 390);
  await waitFor(detail, () => !!document.querySelector('[data-chatbot-launcher]'), 'Detail launcher missing');
  await waitFor(detail, () => {
    const bar = [...document.querySelectorAll('div')].find((node) =>
      typeof node.className === 'string' && node.className.includes('fixed') && node.className.includes('bottom-0')
      && node.textContent.includes('Học phí'));
    return !!bar;
  }, 'Mobile purchase bar missing');
  const aboveBar = await detail.eval(() => {
    const launcher = document.querySelector('[data-chatbot-launcher]').getBoundingClientRect();
    const bar = [...document.querySelectorAll('div')].find((node) =>
      typeof node.className === 'string' && node.className.includes('fixed') && node.className.includes('bottom-0')
      && node.textContent.includes('Học phí')).getBoundingClientRect();
    return { launcherBottom: launcher.bottom, barTop: bar.top, bottomStyle: getComputedStyle(document.querySelector('[data-chatbot-launcher]')).bottom };
  });
  assert.ok(aboveBar.launcherBottom <= aboveBar.barTop - 4, `launcher ${aboveBar.launcherBottom} overlaps bar ${aboveBar.barTop}`);
  await snapshot(detail, 'chatbot-mobile-course-detail');
  await detail.close();

  assert.ok(chatbotCalls.length >= 4);
  console.log(JSON.stringify({ status: 'passed', origin, screenshots: out, chatbotCalls }, null, 2));
} finally {
  await browser.close();
}
