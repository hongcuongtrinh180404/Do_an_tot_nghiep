import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Public views use the live read-only API. Private/admin requests are intercepted,
// including every write, so this test never alters an actual account.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'profile-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.PROFILE_TEST_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const apiOrigin = (process.env.PROFILE_TEST_API_ORIGIN ?? 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const instructorUsername = process.env.PROFILE_TEST_INSTRUCTOR ?? 'instructor1';
const publicResponse = await fetch(`${apiOrigin}/users/public/${instructorUsername}`);
assert.equal(publicResponse.status, 200, 'Need an existing public instructor profile');
const publicProfile = (await publicResponse.json()).data;
for (const key of ['email', 'id', 'passwordHash', 'googleSub', 'status', 'hasPassword']) {
  assert.equal(key in publicProfile, false, `Public profile must not expose ${key}`);
}

const browser = await Browser.launch();
const results = [];
let currentPage;
const viewer = {
  id: '507f1f77bcf86cd799439014', email: 'profilecheck@example.test', username: 'profilecheck',
  fullName: 'Nguyễn Minh An', bio: 'Học lập trình trên Mindly.', role: 'admin',
  status: 'active', isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z',
};
let targetUser = { ...viewer, id: '507f1f77bcf86cd799439015', role: 'student' };
const writes = [];

async function waitFor(page, predicate, message) {
  for (let index = 0; index < 200; index++) {
    if (await page.eval(predicate)) return;
    await sleep(100);
  }
  throw new Error(message);
}

async function open(path, width = 1440, privateFixtures = false) {
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600, reducedMotion: true });
  currentPage = page;
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: privateFixtures
      ? `localStorage.clear();localStorage.setItem('accessToken','profile-test-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(viewer))});`
      : 'localStorage.clear();',
  });
  if (privateFixtures) {
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      const url = new URL(request.url);
      let data = { items: [], total: 0, totalPages: 1, page: 1, limit: 10 };
      const isOwn = url.pathname.endsWith('/users/profile');
      const isDetail = url.pathname.endsWith(`/users/${targetUser.id}`);
      if (request.method === 'PATCH') {
        const payload = JSON.parse(request.postData || '{}');
        writes.push({ path: url.pathname, payload });
        data = isOwn ? { ...viewer, ...payload } : (targetUser = { ...targetUser, ...payload });
      } else if (url.pathname.endsWith('/auth/me') || isOwn) data = viewer;
      else if (isDetail) data = targetUser;
      else if (url.pathname.endsWith('/users')) data = { ...data, items: [targetUser], total: 1 };
      await page.send('Fetch.fulfillRequest', {
        requestId, responseCode: request.method === 'OPTIONS' ? 204 : 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Methods', value: 'GET,PATCH,POST,OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
        body: request.method === 'OPTIONS' ? '' : Buffer.from(JSON.stringify({ success: true, data })).toString('base64'),
      });
    });
  }
  await page.goto(`${origin}${path}`, { timeoutMs: 45000, settleMs: 600 });
  return page;
}

async function snapshot(page, name) {
  await page.screenshot({ path: join(out, `${name}.png`), format: 'png' });
  results.push({ name, status: 'PASS', consoleErrors: page.consoleErrors });
  console.log('PASS', name);
}

async function editName(page, selector, name) {
  await page.eval((selector) => {
    const input = document.querySelector(selector);
    input.focus(); input.select();
  }, selector);
  await page.send('Input.insertText', { text: name });
}

try {
  for (const width of [1440, 768, 390]) {
    const page = await open(`/profile/${instructorUsername}`, width);
    await waitFor(page, () => !!document.querySelector('#profile-courses') && !document.querySelector('[data-testid="public-profile"] [role="status"]'), 'Public profile did not load');
    const state = await page.eval(() => ({
      name: document.querySelector('#profile-name')?.textContent,
      overflow: document.documentElement.scrollWidth > innerWidth,
      emailLeaked: document.querySelector('[data-testid="public-profile"]').textContent.includes('@thc.edu.vn'),
      editInputs: document.querySelectorAll('[data-testid="public-profile"] input, [data-testid="public-profile"] textarea').length,
      signedIn: Boolean(localStorage.getItem('accessToken')),
      coursesFailed: !!document.querySelector('[data-testid="public-profile"] [role="alert"]'),
    }));
    assert.equal(state.name, publicProfile.fullName);
    assert.equal(state.overflow, false);
    assert.equal(state.emailLeaked, false);
    assert.equal(state.editInputs, 0);
    assert.equal(state.signedIn, false);
    assert.equal(state.coursesFailed, false);
    await page.eval(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (value) => { window.__copiedProfileLink = value; },
      } });
      [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Sao chép liên kết')).click();
    });
    await waitFor(page, () => Boolean(window.__copiedProfileLink), 'Copy profile link failed');
    assert.equal(await page.eval(() => window.__copiedProfileLink), `${origin}/profile/${instructorUsername}`);
    await snapshot(page, `public-profile-${width}`);
    await page.close();
  }

  const missing = await open('/profile/does-not-exist-profile-check');
  await waitFor(missing, () => document.querySelector('h1')?.textContent === 'Không tìm thấy hồ sơ', 'Missing profile state was not shown');
  await snapshot(missing, 'public-profile-not-found');
  await missing.close();

  const profile = await open('/profile', 1440, true);
  await waitFor(profile, () => !!document.querySelector('#fullName'), 'Profile form did not hydrate');
  assert.equal(await profile.eval(() => document.querySelector('input[name="username"]') === null), true);
  assert.equal(await profile.eval(() => document.querySelector('a[href="/profile/profilecheck"]') !== null), true);
  await editName(profile, '#fullName', 'Nguyễn Minh An Cập Nhật');
  await waitFor(profile, () => !document.querySelector('#fullName').closest('form').querySelector('button[type="submit"]').disabled, 'Profile save did not activate');
  await profile.eval(() => document.querySelector('#fullName').closest('form').requestSubmit());
  await waitFor(profile, () => [...document.querySelectorAll('[data-sonner-toast]')].some((toast) => toast.textContent.includes('Cập nhật thông tin thành công')), 'Profile did not save');
  assert.ok(writes.some((write) => write.path.endsWith('/users/profile')));
  await snapshot(profile, 'private-profile');
  await profile.close();

  const table = await open('/admin/users', 1440, true);
  await waitFor(table, () => !!document.querySelector('table tbody tr'), 'Admin table did not hydrate');
  assert.equal(await table.eval(() => document.body.textContent.includes('Tên tài khoản')), false);
  assert.equal(await table.eval(() => document.body.textContent.includes('@profilecheck')), false);
  await snapshot(table, 'admin-users');
  await table.close();

  const detail = await open(`/admin/users/${targetUser.id}`, 1440, true);
  await waitFor(detail, () => !!document.querySelector('#user-detail-form input[name="fullName"]'), 'Admin detail form did not hydrate');
  assert.equal(await detail.eval(() => !!document.querySelector('input[name="username"]')), false);
  assert.equal(await detail.eval(() => document.body.textContent.includes('@profilecheck')), false);
  await editName(detail, '#user-detail-form input[name="fullName"]', 'Nguyễn Minh An Quản Trị');
  await detail.eval(() => document.querySelector('#user-detail-form').requestSubmit());
  for (let index = 0; index < 100 && writes.length < 2; index++) await sleep(100);
  assert.ok(writes.some((write) => write.path.endsWith(`/users/${targetUser.id}`)), 'Admin form must still save');
  assert.ok(writes.every((write) => !('username' in write.payload)), 'No profile/admin write may include username');
  await snapshot(detail, 'admin-user-detail');
  await detail.close();

  writeFileSync(join(out, 'results.json'), JSON.stringify({ results, writes }, null, 2));
  console.log(`Screenshots and results: ${out}`);
} catch (error) {
  if (currentPage) await currentPage.screenshot({ path: join(out, 'failure.png'), format: 'png' }).catch(() => {});
  writeFileSync(join(out, 'failure.json'), JSON.stringify({
    error: error.message, writes, results, consoleErrors: currentPage?.consoleErrors,
  }, null, 2));
  throw error;
} finally {
  await browser.close();
}
