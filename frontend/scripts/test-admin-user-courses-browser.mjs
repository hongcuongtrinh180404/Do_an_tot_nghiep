import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// UI fixtures only: every API request is intercepted, with no login/application-data writes.
const origin = process.env.ADMIN_USER_PREVIEW_ORIGIN || 'http://localhost:3000';
process.env.TASTE_SKILL_TMP ??= join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'admin-user-courses-browser');
mkdirSync(out, { recursive: true });
const dates = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
const viewer = { id: '607f1f77bcf86cd799439010', fullName: 'Quản trị viên kiểm thử',
  email: 'viewer@example.test', role: 'admin', status: 'active', isEmailVerified: true, ...dates };
const profiles = ['student', 'instructor', 'admin'].map((role, index) => ({
  ...viewer, id: `607f1f77bcf86cd79943901${index + 1}`, role,
  email: `${role}@example.test`, fullName: `Tài khoản ${role}`, status: index === 2 ? 'banned' : 'active',
}));
const emptyTeaching = { stats: { totalCourses: 0, totalStudents: 0, totalRevenue: 0,
  netRevenue: 0, averageRating: 0, totalReviews: 0 }, courses: [] };
const enrollment = (profile) => ({
  id: `enrollment-${profile.role}`, courseId: '607f1f77bcf86cd799439020',
  title: `Khóa đăng ký của ${profile.role}`, thumbnailUrl: null, enrolledAt: '2026-10-12T00:00:00Z',
  paidAt: profile.role === 'admin' ? null : '2026-10-13T00:00:00Z',
  price: profile.role === 'admin' ? 0 : 150000, isFree: profile.role === 'admin',
  paymentStatus: profile.role === 'admin' ? null : 'PAID',
  totalLessons: profile.role === 'admin' ? 0 : 4, completedLessons: 0,
  progressPercent: profile.role === 'admin' ? null : 0, status: 'IN_PROGRESS',
});
const teaching = {
  stats: { totalCourses: 1, totalStudents: 2, totalRevenue: 250000, netRevenue: 200000, averageRating: 4.5, totalReviews: 2 },
  courses: [{ id: '607f1f77bcf86cd799439021', title: 'Khóa giảng dạy từ database',
    thumbnailUrl: null, price: 900000, level: 'all_levels', status: 'archived',
    studentCount: 2, revenue: 250000, rating: 4.5, reviewCount: 2, updatedAt: dates.updatedAt }],
};
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, arg) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await page.eval(predicate, arg)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function click(page, label) {
  assert.equal(await page.eval((label) => {
    const button = [...document.querySelectorAll('main button')]
      .find((node) => node.getAttribute('aria-label') === label || node.textContent.trim().startsWith(label));
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, label), true, `Usable button: ${label}`);
}

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ width, height: width === 390 ? 1000 : 1100, mobile: width < 600 });
    const state = { writes: [], errors: [], failEnrolled: false, failTeaching: false, requests: [] };
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('accessToken','admin-user-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(viewer))});`,
    });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      async function fulfill(data, status = 200) {
        await page.send('Fetch.fulfillRequest', {
          requestId, responseCode: status,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
            { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
            { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          ],
          body: status === 204 ? '' : Buffer.from(JSON.stringify(status < 400
            ? { success: true, data } : { code: 'TEST_DATA_UNAVAILABLE', message: 'Cần đối soát dữ liệu kiểm thử' })).toString('base64'),
        });
      }
      try {
        if (request.method === 'OPTIONS') return await fulfill(null, 204);
        const path = new URL(request.url).pathname.replace('/api/v1', '');
        state.requests.push(path);
        if (request.method !== 'GET') {
          state.writes.push(request.method);
          return await fulfill(null, 405);
        }
        const [, , userId, endpoint] = path.split('/');
        const profile = profiles.find((item) => item.id === userId);
        if (profile && endpoint === 'enrolled-courses') {
          return await fulfill(state.failEnrolled ? null : [enrollment(profile)], state.failEnrolled ? 503 : 200);
        }
        if (profile && endpoint === 'teaching') {
          return await fulfill(profile.role === 'instructor' ? teaching : emptyTeaching, state.failTeaching ? 422 : 200);
        }
        return await fulfill(path === '/auth/me' ? viewer
          : path === '/users' ? { items: profiles, total: 13, page: 2, limit: 10, totalPages: 2 }
          : profile ? profile : []);
      } catch (error) {
        state.errors.push(String(error));
        await fulfill(null, 500).catch(() => {});
      }
    });

    async function navigate(profile) {
      await page.goto(`${origin}/admin/users/${profile.id}?returnUrl=${encodeURIComponent('/admin/users?page=2')}`, {
        timeoutMs: 60000, settleMs: 250,
      });
      await waitFor(page, (name) => document.querySelector('main h1')?.textContent === name,
        'account profile', profile.fullName);
    }

    try {
      await navigate(profiles[0]);
      await waitFor(page, () => document.querySelector('main')?.textContent.includes('Khóa đăng ký của student'), 'student courses');
      await click(page, 'Đang học');
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('Khóa đăng ký của student')), true);
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('0%')), true);
      await page.eval(() => document.querySelector('main h4')?.closest('section')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: join(out, `student-${width}.png`), format: 'png', fullPage: true });
      await click(page, 'Quay lại danh sách');
      await waitFor(page, () => location.pathname === '/admin/users' && new URLSearchParams(location.search).get('page') === '2',
        'preserved returnUrl page 2');

      await navigate(profiles[1]);
      await waitFor(page, () => document.querySelector('main')?.textContent.includes('Khóa giảng dạy từ database'), 'instructor teaching data');
      assert.equal(await page.eval(() => {
        const text = document.querySelector('main').textContent;
        return text.includes('250.000') && text.includes('200.000') && text.includes('Mọi trình độ');
      }), true);
      await click(page, 'Ngừng bán');
      await page.eval(() => {
        const label = [...document.querySelectorAll('main span')].find((node) => node.textContent === 'Tổng số khóa học');
        label?.closest('.grid')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      await page.screenshot({ path: join(out, `instructor-${width}.png`), format: 'png', fullPage: true });
      await page.eval(() => document.querySelector('main h4')?.closest('section')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: join(out, `teaching-course-${width}.png`), format: 'png', fullPage: true });
      await click(page, 'Khóa học đã đăng ký');
      await waitFor(page, () => document.querySelector('main').textContent.includes('Khóa đăng ký của instructor'), 'instructor enrollment');

      state.failTeaching = true;
      await navigate(profiles[1]);
      await waitFor(page, () => !!document.querySelector('main [role="alert"]'), 'explicit teaching error');
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('Tổng doanh thu tạo ra')), false);
      await click(page, 'Khóa học đã đăng ký');
      await waitFor(page, () => document.querySelector('main').textContent.includes('Khóa đăng ký của instructor'), 'independent learning endpoint');
      state.failTeaching = false;

      await navigate(profiles[2]);
      await waitFor(page, () => document.querySelector('main').textContent.includes('Khóa đăng ký của admin'), 'banned admin data');
      assert.equal(await page.eval(() => {
        const text = document.querySelector('main').textContent;
        return text.includes('Đăng ký miễn phí') && text.includes('Chưa có bài video để tính tiến độ');
      }), true);

      state.failEnrolled = true;
      await navigate(profiles[0]);
      await waitFor(page, () => document.querySelector('main [role="alert"]')?.textContent.includes('Không thể tải khóa học đã đăng ký'), 'enrollment error');
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('Không tìm thấy khóa học nào')), false);
      state.failEnrolled = false;
      await click(page, 'Thử lại');
      await waitFor(page, () => document.querySelector('main').textContent.includes('Khóa đăng ký của student'), 'retry recovery');
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('[Giao diện mẫu]')), false);
      assert.equal(state.writes.length, 0);
      assert.deepEqual(state.errors, []);
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, roles: profiles.map((item) => item.role), returnPage: 2, retryRecovered: true, writes: 0 });
    } finally {
      off();
      await page.close();
    }
  }
  console.log(JSON.stringify({ origin, results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
