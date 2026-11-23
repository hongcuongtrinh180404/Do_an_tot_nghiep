import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Real UI + real backend + existing accounts. No fulfilled/mock API responses.
// Only the chart's network request is deliberately blocked for the failure test.
const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const mongoose = requireBackend('mongoose');
const { JwtService } = requireBackend('@nestjs/jwt');
const env = parseEnv(readFileSync(new URL('../../backend/.env', import.meta.url), 'utf8'));
const origin = process.env.ACTIVITY_FRONTEND_URL || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
process.env.TASTE_SKILL_TMP ||= join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
const output = join(process.env.TASTE_SKILL_TMP, 'activity-history', 'browser');
mkdirSync(output, { recursive: true });
const client = new mongoose.mongo.MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
const jwt = new JwtService();
let browser;
async function waitFor(page, condition, label, arg) {
  for (let n = 0; n < 400; n++) {
    if (await page.eval(condition, arg)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}
try {
  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME || 'thc_datn');
  const admin = await db.collection('users').findOne({ role: 'admin', status: 'active', deletedAt: null });
  const course = await db.collection('courses').findOne({ status: 'published', deletedAt: null, price: { $gt: 0 } });
  const instructor = await db.collection('users').findOne({ _id: course.instructorId, status: 'active', deletedAt: null });
  const paid = await db.collection('orders').find({ status: 'PAID', deletedAt: null }).toArray();
  const gross = paid.reduce((sum, row) => sum + row.amount, 0);
  const formattedGross = new Intl.NumberFormat('vi-VN').format(gross);
  browser = await Browser.launch();
  const results = [];
  async function pageFor(user, width = 1440) {
    const page = await browser.newPage({ width, height: 1100, mobile: width < 600 });
    const token = await jwt.signAsync({ sub: String(user._id), email: user.email, role: user.role }, { secret: env.JWT_SECRET, expiresIn: 300 });
    const profile = { id: String(user._id), fullName: user.fullName, email: user.email, role: user.role, status: user.status,
      username: user.username, isEmailVerified: !!user.isEmailVerified, avatarUrl: user.avatarUrl ?? null };
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source:
      `localStorage.setItem('accessToken',${JSON.stringify(token)});localStorage.setItem('user',${JSON.stringify(JSON.stringify(profile))});` });
    const requests = [];
    await page.send('Network.enable');
    browser.on(page.sessionId, 'Network.responseReceived', ({ response }) => {
      if (response.url.includes('/api/v1/')) requests.push({ path: new URL(response.url).pathname, status: response.status });
    });
    return { page, requests };
  }
  for (const width of [1440, 390]) {
    const { page, requests } = await pageFor(admin, width);
    try {
      await page.goto(`${origin}/admin/dashboard`, { timeoutMs: 90000, settleMs: 100 });
      await waitFor(page, amount => document.querySelector('#revenue-section')?.textContent.includes(amount), 'real admin chart total', formattedGross);
      assert(requests.some(row => row.path === '/api/v1/admin/dashboard/chart' && row.status === 200));
      const before = await page.eval(() => ({
        text: document.querySelector('#revenue-section').textContent,
        width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      }));
      assert(before.text.includes(formattedGross));
      await page.screenshot({ path: join(output, `admin-real-${width}.png`), format: 'png', fullPage: true });
      if (width === 1440) {
        await page.send('Network.setBlockedURLs', { urls: ['*api/v1/admin/dashboard/chart*'] });
        await page.eval(() => [...document.querySelectorAll('#revenue-section button')].find(button => button.textContent.trim() === 'Tháng').click());
        await waitFor(page, () => document.querySelector('#revenue-section [role="alert"]')?.textContent.includes('Không có số liệu thay thế'), 'chart failure without fabricated statistics');
        const failed = await page.eval(() => document.querySelector('#revenue-section').textContent);
        assert(!failed.includes(formattedGross), 'Failed chart must not retain a displayed stale amount');
        assert(failed.includes('—'));
        await page.screenshot({ path: join(output, 'admin-chart-network-failure.png'), format: 'png', fullPage: true });
        await page.send('Network.setBlockedURLs', { urls: [] });
        await page.eval(() => document.querySelector('#revenue-section [role="alert"] button').click());
        await waitFor(page, amount => !document.querySelector('#revenue-section [role="alert"]')
          && document.querySelector('#revenue-section')?.textContent.includes(amount), 'chart retry recovers real database total', formattedGross);
      }
      assert.deepEqual(page.consoleErrors, []);
      results.push({ screen: 'admin/dashboard', width, grossRevenue: gross, realApiResponses: requests.length,
        noHorizontalOverflow: before.documentWidth <= before.width, failureAndRetryTested: width === 1440 });
    } finally { await page.close(); }
  }
  const { page, requests } = await pageFor(instructor);
  try {
    await page.goto(`${origin}/instructor/statistics`, { timeoutMs: 90000, settleMs: 100 });
    await waitFor(page, () => !!document.querySelector('main tbody') && !document.querySelector('main [role="alert"]'), 'real instructor statistics');
    await page.eval(() => document.querySelector('main [role="combobox"]').click());
    await waitFor(page, () => [...document.querySelectorAll('[role="option"]')].some(row => row.textContent.trim() === 'Tất cả thời gian'), 'instructor range options');
    await page.eval(() => [...document.querySelectorAll('[role="option"]')].find(row => row.textContent.trim() === 'Tất cả thời gian').click());
    const expected = paid.filter(row => String(row.instructorId) === String(instructor._id)).reduce((sum, row) => sum + row.amount, 0);
    const amount = new Intl.NumberFormat('vi-VN').format(expected);
    await waitFor(page, value => document.querySelector('main')?.textContent.includes(value), 'instructor gross revenue from real API', amount);
    await page.screenshot({ path: join(output, 'instructor-real-1440.png'), format: 'png', fullPage: true });
    assert(requests.some(row => row.path === '/api/v1/instructor/teaching-stats/overview' && row.status === 200));
    assert(requests.some(row => row.path === '/api/v1/reviews/instructor' && row.status === 200));
    assert.deepEqual(page.consoleErrors, []);
    results.push({ screen: 'instructor/statistics', width: 1440, grossRevenue: expected, realApiResponses: requests.length });
  } finally { await page.close(); }
  writeFileSync(join(output, 'results.json'), JSON.stringify({ ok: true, results, screenshots: output }, null, 2));
  console.log(JSON.stringify({ ok: true, results, screenshots: output }, null, 2));
} finally {
  await browser?.close();
  await client.close();
}
