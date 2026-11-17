import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Real public SSR/API data is read-only. Browser API fixtures intercept every
// private request and write; no real account, enrollment or progress is modified.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'unified-profile-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.PROFILE_TEST_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const apiOrigin = (process.env.PROFILE_TEST_API_ORIGIN ?? 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const username = process.env.PROFILE_TEST_INSTRUCTOR ?? 'instructor1';
const publicResponse = await fetch(`${apiOrigin}/users/public/${username}`);
assert.equal(publicResponse.status, 200);
const profile = (await publicResponse.json()).data;
const realTeaching = (await (await fetch(`${apiOrigin}/users/public/${username}/courses?type=teaching`)).json()).data;
assert.ok(realTeaching.items.length <= 5);
const forbidden = ['email', 'id', 'passwordHash', 'googleSub', 'status', 'hasPassword'];
assert.ok(forbidden.every((key) => !(key in profile)));

const browser = await Browser.launch();
const results = [];
const writes = [];
const requests = [];
let currentPage;
let owner = {
  id: profile.instructorId, username, fullName: profile.fullName, role: 'instructor',
  email: 'owner-private@example.test', bio: 'Giới thiệu của chủ hồ sơ.\nDòng thứ hai.',
  status: 'active', isEmailVerified: true, createdAt: profile.createdAt,
};
const other = { ...owner, id: '507f1f77bcf86cd799439017', username: 'other-account', fullName: 'Người xem khác', role: 'student' };
let targetUser = { ...other, id: '507f1f77bcf86cd799439018', username: 'admin-target' };

const fixtureCourse = (index, type) => ({
  id: `${type}-${index}`, title: `${type === 'learning' ? 'Khóa học đã sở hữu' : 'Khóa học giảng dạy'} ${index + 1}`,
  slug: `${type}-${index}`, thumbnailUrl: null, instructorName: 'Giảng viên khác',
  instructorUsername: 'instructor2',
  progress: type === 'learning'
    ? { percent: [25, 50, 0, 100, null, 60, 70, 80][index], status: 'in_progress' } : null,
});
const fixtureCourses = {
  teaching: Array.from({ length: 7 }, (_, index) => fixtureCourse(index, 'teaching')),
  learning: Array.from({ length: 8 }, (_, index) => fixtureCourse(index, 'learning')),
};

async function waitFor(page, predicate, message) {
  for (let index = 0; index < 250; index++) {
    if (await page.eval(predicate)) return;
    await sleep(100);
  }
  throw new Error(message);
}

async function open(path, width = 1440, { viewer = null, fixtures = false } = {}) {
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600, reducedMotion: true });
  currentPage = page;
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: viewer
      ? `localStorage.clear();localStorage.setItem('accessToken','profile-test-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(viewer))});`
      : 'localStorage.clear();',
  });
  if (fixtures) {
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      const url = new URL(request.url);
      requests.push({ path: url.pathname, method: request.method, viewer: viewer?.username ?? 'guest' });
      let data = { items: [], total: 0, totalPages: 1, page: 1, limit: 10 };
      const isOwn = url.pathname.endsWith('/users/profile');
      const isDetail = url.pathname.endsWith(`/users/${targetUser.id}`);
      if (request.method === 'PATCH') {
        const payload = JSON.parse(request.postData || '{}');
        writes.push({ path: url.pathname, payload });
        data = isOwn ? (owner = { ...owner, ...payload }) : (targetUser = { ...targetUser, ...payload });
      } else if (url.pathname.endsWith('/auth/me')) data = { ...viewer, ...(viewer?.id === owner.id ? owner : {}) };
      else if (isOwn) data = owner;
      else if (isDetail) data = targetUser;
      else if (url.pathname.endsWith('/users')) data = { ...data, items: [targetUser], total: 1 };
      else if (/\/users\/public\/[^/]+\/courses$/.test(url.pathname)) {
        const type = url.searchParams.get('type') || 'learning';
        const offset = Number(url.searchParams.get('cursor') || 0);
        const all = fixtureCourses[type];
        data = {
          items: all.slice(offset, offset + 5),
          nextCursor: offset + 5 < all.length ? String(offset + 5) : null,
          counts: { teaching: 7, learning: 8 },
        };
      }
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
  assert.equal(page.consoleErrors.length, 0, `${name}: browser errors: ${page.consoleErrors.join(', ')}`);
  await page.screenshot({ path: join(out, `${name}.png`), format: 'png' });
  results.push({ name, status: 'PASS' });
  console.log('PASS', name);
}

async function edit(page, selector, value) {
  await page.eval((selector) => {
    const input = document.querySelector(selector);
    input.focus(); input.select();
  }, selector);
  // insertText with an empty string does not delete a selection.
  if (value) await page.send('Input.insertText', { text: value });
  else {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  }
}

const cardCount = () => document.querySelectorAll('[data-testid="profile-course-card"]').length;
const noEdit = () => !document.querySelector('[data-testid="public-profile"] input, [data-testid="public-profile"] textarea');

try {
  for (const width of [1440, 768, 390]) {
    const page = await open(`/profile/${username}`, width);
    await waitFor(page, () => !!document.querySelector('#profile-courses') && !document.querySelector('[data-testid="public-profile"] [role="status"]'), 'Public profile did not load');
    assert.equal(await page.eval(noEdit), true);
    assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.eval(() => document.querySelector('#profile-name')?.textContent), profile.fullName);
    assert.equal(await page.eval(cardCount), Math.min(5, realTeaching.counts.teaching));
    assert.equal(await page.eval(() => document.querySelectorAll('[role="tab"]').length), 2);
    await snapshot(page, `public-profile-${width}`);
    await page.close();
  }

  const studentResponse = await fetch(`${apiOrigin}/users/public/student1/courses?type=learning`);
  assert.equal(studentResponse.status, 200);
  const studentCourses = (await studentResponse.json()).data;
  const student = await open('/profile/student1');
  await waitFor(student, () => !!document.querySelector('#profile-courses') && !document.querySelector('[data-testid="public-profile"] [role="status"]'), 'Student profile did not load');
  assert.equal(await student.eval(() => document.querySelectorAll('[role="tab"]').length), 1);
  assert.equal(await student.eval(cardCount), studentCourses.items.length);
  assert.equal(await student.eval(noEdit), true);
  const numericProgress = studentCourses.items.find((item) => typeof item.progress?.percent === 'number');
  if (numericProgress) {
    const displayed = await student.eval(() => [...document.querySelectorAll('[role="progressbar"]')].map((bar) => Number(bar.getAttribute('aria-valuenow'))));
    assert.ok(displayed.includes(numericProgress.progress.percent));
  }
  await snapshot(student, 'public-student-real-owned-progress');
  await student.close();

  const guest = await open(`/profile/${username}`, 1440, { fixtures: true });
  await waitFor(guest, () => document.querySelectorAll('[data-testid="profile-course-card"]').length === 5, 'Initial page must show five teaching cards');
  await guest.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Xem thêm').click());
  await waitFor(guest, () => document.querySelectorAll('[data-testid="profile-course-card"]').length === 7, 'Load more must append teaching cards');
  assert.equal(await guest.eval(() => [...document.querySelectorAll('button')].some((button) => button.textContent === 'Xem thêm')), false);
  await guest.eval(() => document.querySelector('#profile-tab-learning').click());
  await waitFor(guest, () => document.querySelectorAll('[data-testid="profile-course-card"]').length === 5 && !!document.querySelector('[role="progressbar"]'), 'Learning tab must load its own first five cards');
  assert.equal(await guest.eval(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')), '25');
  assert.equal(await guest.eval(() => document.querySelectorAll('[role="progressbar"]').length), 4);
  await guest.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Xem thêm').click());
  await waitFor(guest, () => document.querySelectorAll('[data-testid="profile-course-card"]').length === 8, 'Load more must append learning cards');
  await snapshot(guest, 'guest-learning-progress');
  await guest.eval(() => document.querySelector('#profile-tab-teaching').click());
  assert.equal(await guest.eval(cardCount), 7, 'Switching tabs must preserve expanded results');
  await guest.eval(() => {
    document.querySelector('#profile-tab-teaching').focus();
    document.querySelector('#profile-tab-teaching').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  });
  assert.equal(await guest.eval(() => document.activeElement.id), 'profile-tab-learning');
  assert.equal(await guest.eval(cardCount), 8);
  await snapshot(guest, 'independent-load-more-and-keyboard-tabs');
  await guest.close();

  const foreign = await open(`/profile/${username}`, 1440, { viewer: other, fixtures: true });
  await waitFor(foreign, () => document.querySelectorAll('[data-testid="profile-course-card"]').length === 5, 'Foreign signed-in viewer did not load');
  assert.equal(await foreign.eval(noEdit), true);
  await foreign.eval(() => document.querySelector('#profile-tab-learning').click());
  await waitFor(foreign, () => !!document.querySelector('[role="progressbar"]'), 'Progress missing');
  assert.equal(await foreign.eval(() => document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')), '25');
  assert.equal(requests.some((request) => request.viewer === other.username && request.path.endsWith('/users/profile')), false, 'A visitor must not fetch the private edit profile');
  await snapshot(foreign, 'signed-in-other-user-read-only');
  await foreign.close();

  const own = await open('/profile', 1440, { viewer: owner, fixtures: true });
  await waitFor(own, () => !!document.querySelector('#fullName'), 'Owner edit form did not hydrate');
  assert.equal(await own.eval(() => location.pathname), `/profile/${username}`, 'Legacy path must redirect to canonical owner URL');
  assert.equal(await own.eval(() => !!document.querySelector('input[name="username"]')), false);
  await edit(own, '#fullName', 'Nguyễn Minh An Cập Nhật');
  await edit(own, '#bio', '');
  await own.eval(() => document.querySelector('#fullName').closest('form').requestSubmit());
  for (let index = 0; index < 100 && writes.length === 0; index++) await sleep(100);
  assert.equal(writes.at(-1)?.payload.bio, '', 'The owner must be able to clear a biography');
  await waitFor(own, () => document.querySelector('#fullName')?.value === 'Nguyễn Minh An Cập Nhật' && document.querySelector('#fullName').closest('form').querySelector('button[type="submit"]').disabled, 'Saved owner state was not reset');
  await snapshot(own, 'owner-canonical-edit');
  await own.eval(() => document.querySelector('#profile-tab-learning').click());
  await waitFor(own, () => !!document.querySelector('[data-testid="profile-course-card"] a[href="/profile/instructor2"]'), 'Missing instructor profile link');
  await own.eval(() => document.querySelector('[data-testid="profile-course-card"] a[href="/profile/instructor2"]').click());
  await waitFor(own, () => location.pathname === '/profile/instructor2' && !!document.querySelector('#profile-name'), 'Foreign profile navigation failed');
  assert.equal(await own.eval(noEdit), true, 'Owner edit UI must disappear on a different profile even with private data cached');
  assert.equal(await own.eval(() => document.querySelector('[data-testid="public-profile"]').textContent.includes('owner-private@example.test')), false);
  await snapshot(own, 'owner-to-other-profile-no-private-cache-leak');
  await own.close();

  const missing = await open('/profile/does-not-exist-profile-check');
  await waitFor(missing, () => document.querySelector('h1')?.textContent === 'Không tìm thấy hồ sơ', 'Missing profile state was not shown');
  await snapshot(missing, 'public-profile-not-found');
  await missing.close();

  const adminViewer = { ...other, role: 'admin' };
  const table = await open('/admin/users', 1440, { viewer: adminViewer, fixtures: true });
  await waitFor(table, () => !!document.querySelector('table tbody tr'), 'Admin table did not hydrate');
  assert.equal(await table.eval(() => document.body.textContent.includes('Tên tài khoản')), false);
  await snapshot(table, 'admin-users-still-no-username');
  await table.close();
  const detail = await open(`/admin/users/${targetUser.id}`, 1440, { viewer: adminViewer, fixtures: true });
  await waitFor(detail, () => !!document.querySelector('#user-detail-form input[name="fullName"]'), 'Admin detail did not hydrate');
  assert.equal(await detail.eval(() => !!document.querySelector('input[name="username"]')), false);
  await snapshot(detail, 'admin-details-still-no-username');
  await detail.close();

  if (realTeaching.items.length && profile.bio) {
    const course = await open(`/courses/${realTeaching.items[0].slug || realTeaching.items[0].id}`);
    await waitFor(course, () => !!document.querySelector('#tab-instructor'), 'Course detail tabs did not load');
    await course.eval(() => document.querySelector('#tab-instructor').click());
    await waitFor(course, () => !!document.querySelector('#tabpanel-instructor'), 'Instructor tab did not open');
    assert.equal(await course.eval((bio) => document.querySelector('#tabpanel-instructor').textContent.includes(bio.trim()), profile.bio), true, 'Course instructor tab must use the actual profile biography');
    assert.equal(await course.eval(() => document.querySelector('#tabpanel-instructor').textContent.includes('Với hơn 8 năm kinh nghiệm')), false);
    await snapshot(course, 'course-instructor-actual-profile-bio');
    await course.close();
  }

  assert.ok(writes.every((write) => !('username' in write.payload)));
  assert.equal(requests.some((request) => request.path.includes('/learning-progress/')), false, 'Public cards must not fetch the viewer own playback progress');
  writeFileSync(join(out, 'results.json'), JSON.stringify({ results, writes }, null, 2));
  console.log(`Screenshots and results: ${out}`);
} catch (error) {
  if (currentPage) await currentPage.screenshot({ path: join(out, 'failure.png'), format: 'png' }).catch(() => {});
  writeFileSync(join(out, 'failure.json'), JSON.stringify({
    error: error.message, writes, results, requests, consoleErrors: currentPage?.consoleErrors,
  }, null, 2));
  throw error;
} finally {
  await browser.close();
}
