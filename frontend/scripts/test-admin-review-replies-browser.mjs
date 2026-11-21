import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, Page, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { probe, app as appProbe } from '../../.agents/skills/design-taste-frontend/scripts/lib/probe.mjs';
import { judge, judgeApp, APP_SKIP } from '../../.agents/skills/design-taste-frontend/scripts/lib/rules.mjs';

// Exercise the real Next UI with intercepted API responses. Never write to application data.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'admin-review-replies-browser');
mkdirSync(out, { recursive: true });
const before = process.argv.includes('--before');
let origin = process.env.REVIEW_PREVIEW_ORIGIN || 'http://localhost:3000';
const adminId = '607f1f77bcf86cd799439011';
const studentId = '607f1f77bcf86cd799439012';
const courseId = '607f1f77bcf86cd799439013';
const reviewId = '607f1f77bcf86cd799439014';
const instructorId = '607f1f77bcf86cd799439015';
const dates = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const admin = { id: adminId, fullName: 'Quản trị viên hỗ trợ', email: 'admin@example.test',
  role: 'admin', status: 'active', isEmailVerified: true };
const course = { id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-trong-nau-an',
  instructorId, price: 0, level: 'beginner', status: 'published', sections: [],
  description: '<p>Tìm hiểu các phản ứng trong nấu ăn.</p>', ratingAvg: 2, reviewCount: 1, ...dates };
const originalReview = { id: reviewId, courseId, userId: studentId, rating: 2,
  comment: 'Video bài học không tải được, mong hệ thống kiểm tra giúp.', status: 'visible',
  adminReply: null, instructorReply: { content: 'Tôi đã kiểm tra, nội dung bài giảng vẫn đầy đủ.',
    instructorId, instructorName: 'Giảng viên kiểm thử', repliedAt: dates.createdAt, updatedAt: null },
  user: { id: studentId, fullName: 'Nguyễn Minh Anh', email: 'student@example.test' },
  course: { id: courseId, title: course.title, slug: course.slug }, reports: [], moderationHistory: [], ...dates };
let production;
if (process.argv.includes('--production')) {
  production = spawn(process.execPath, [
    fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)),
    'start', '--hostname', '127.0.0.1', '--port', '0',
  ], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Production server did not start:\n${output}`)), 60000);
      const receive = (chunk) => {
        output += chunk.toString();
        const address = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (address) origin = address[0];
        if (address && /Ready in/i.test(output)) { clearTimeout(timer); resolve(); }
      };
      production.stdout.on('data', receive);
      production.stderr.on('data', receive);
      production.once('error', (error) => { clearTimeout(timer); reject(error); });
      production.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Production server exited (${code}):\n${output}`)); });
    });
  } catch (error) {
    production.kill();
    throw error;
  }
}
const browser = await Browser.launch().catch((error) => { production?.kill(); throw error; });
const results = [];

async function waitFor(page, predicate, label, arg) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await page.eval(predicate, arg)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function click(page, label, selector = '[role="dialog"]') {
  assert.equal(await page.eval(({ label, selector }) => {
    const button = [...(document.querySelector(selector)?.querySelectorAll('button') || [])]
      .find((node) => node.getAttribute('aria-label') === label || node.textContent.trim() === label);
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, { label, selector }), true, `Button should be usable: ${label}`);
}

async function draft(page, content) {
  await page.eval((content) => {
    const field = document.querySelector('textarea[name="adminReply"]');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, content);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }, content);
}

async function capture(page, selector, name) {
  await page.eval((selector) => {
    document.querySelector(selector)?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, selector);
  await sleep(150);
  await page.screenshot({ path: join(out, name), format: 'png' });
}

async function inspect(page) {
  const metrics = await page.eval(probe);
  const appMetrics = await page.eval(appProbe);
  return [
    ...judge(metrics).filter((finding) => !APP_SKIP.has(finding.id)),
    ...judgeApp(appMetrics, metrics),
  ];
}

async function fixturePage(width, state, role = 'admin') {
  // Keep role-specific storage isolated so a student login cannot log out the admin page.
  const { browserContextId } = await browser.send('Target.createBrowserContext');
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new Page(browser, targetId, sessionId);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.setViewport({ width, height: width === 390 ? 844 : 1000, mobile: width < 600 });
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const user = role === 'admin' ? admin : { ...admin, id: studentId, fullName: 'Nguyễn Minh Anh', role };
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: role === 'guest' ? '' : `localStorage.setItem('accessToken','admin-review-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
  async function fulfill(requestId, data, status = 200) {
    return page.send('Fetch.fulfillRequest', { requestId, responseCode: status,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
      ],
      body: status === 204 ? '' : Buffer.from(JSON.stringify({
        success: status < 400, data, message: status < 400 ? 'OK' : 'Không thể gửi phản hồi kiểm thử.',
      })).toString('base64'),
    });
  }
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const path = new URL(request.url).pathname.replace('/api/v1', '');
      if (request.method === 'OPTIONS') return await fulfill(requestId, null, 204);
      if (request.method !== 'GET') {
        state.writes.push({ method: request.method, path });
        assert.equal(path, `/reviews/admin/${reviewId}/reply`);
        assert.equal(request.method, 'POST');
        if (state.hold) {
          state.hold = false;
          await new Promise((resolve) => { state.release = resolve; });
        }
        if (state.failNext) {
          state.failNext = false;
          return await fulfill(requestId, null, 403);
        }
        const payload = JSON.parse(request.postData);
        assert.deepEqual(Object.keys(payload), ['reply']);
        assert.equal(payload.reply, payload.reply.trim());
        const existing = state.review.adminReply;
        state.review.adminReply = {
          content: payload.reply, adminId, adminName: admin.fullName,
          repliedAt: existing?.repliedAt || '2026-11-20T10:00:00Z',
          updatedAt: existing ? '2026-11-20T11:00:00Z' : null,
          updatedById: existing ? adminId : null, updatedByName: existing ? admin.fullName : null,
        };
        return await fulfill(requestId, state.review);
      }
      const visibleItems = state.review.status === 'visible' && !state.review.deletedAt ? [state.review] : [];
      const list = (items) => ({ items, total: items.length, page: 1, limit: 10, totalPages: 1 });
      const stats = { totalReviews: visibleItems.length, averageRating: visibleItems.length ? 2 : 0,
        distribution: [5, 4, 3, 2, 1].map((stars) => ({
          stars, count: stars === 2 ? visibleItems.length : 0, percentage: stars === 2 && visibleItems.length ? 100 : 0,
        })) };
      const data = path === '/auth/me' ? user
        : path === '/reviews/admin/stats' ? { total: 1, visibleCount: visibleItems.length,
          hiddenCount: state.review.status === 'hidden' ? 1 : 0, deletedCount: state.review.deletedAt ? 1 : 0,
          reportedCount: 0, averageRating: stats.averageRating }
        : path === '/reviews/admin' ? list([state.review])
        : path === `/reviews/admin/${reviewId}` ? state.review
        : path === `/reviews/courses/${courseId}` ? list(visibleItems)
        : path === `/reviews/courses/${courseId}/stats` ? stats
        : path === `/reviews/courses/${courseId}/my-review` ? state.review
        : path.endsWith('/eligibility') ? { canReview: false, isEnrolled: true, progressPercent: 50, isInstructor: false, hasReviewed: true }
        : path === `/courses/public/${courseId}` ? course
        : path === `/enrollments/check/${courseId}` ? { isEnrolled: false }
        : [];
      return await fulfill(requestId, data);
    } catch (error) {
      state.errors.push(String(error));
      await fulfill(requestId, null, 500).catch(() => {});
    }
  });
  return { page, close: async () => {
    off();
    await page.close();
    await browser.send('Target.disposeBrowserContext', { browserContextId });
  } };
}

async function openDetail(page) {
  await page.goto(`${origin}/admin/reviews`, { timeoutMs: 60000, settleMs: 300 });
  await waitFor(page, () => [...document.querySelectorAll('main button')].some((node) => node.textContent.trim() === 'Chi tiết'), 'admin list loaded');
  await click(page, 'Chi tiết', 'main');
  await waitFor(page, () => document.querySelector('[role="dialog"]')?.textContent.includes('Video bài học không tải được'), 'review detail loaded');
}

try {
  for (const width of [1440, 768, 390]) {
    const state = { review: structuredClone(originalReview), writes: [], errors: [], failNext: false, hold: false };
    const fixture = await fixturePage(width, state);
    const { page } = fixture;
    try {
      await openDetail(page);
      if (before) {
        await capture(page, '[role="dialog"]', `before-${width}.png`);
        results.push({ width, findings: await inspect(page) });
        continue;
      }
      await waitFor(page, () => !!document.querySelector('textarea[name="adminReply"]'), 'admin reply composer');
      assert.equal(await page.eval(() => document.querySelector('textarea').labels.length), 1);
      assert.equal(await page.eval(() => document.querySelector('textarea').maxLength), 2000);
      assert.equal(await page.eval(() => document.querySelector('[data-ui="admin-review-reply"] button[type="submit"]').disabled), true);
      await draft(page, ' \n ');
      assert.equal(await page.eval(() => document.querySelector('button[type="submit"]').disabled), true);
      await draft(page, 'x'.repeat(2001));
      assert.equal(await page.eval(() => document.querySelector('button[type="submit"]').disabled), true);
      await draft(page, '  Cảm ơn bạn đã báo lỗi. Chúng tôi đang kiểm tra hệ thống phát video.\nMong bạn thông cảm.  ');
      await capture(page, '[data-ui="admin-review-reply"]', `composer-${width}.png`);

      state.hold = true;
      await click(page, 'Gửi phản hồi');
      await waitFor(page, () => document.querySelector('[data-ui="admin-review-reply"] form')?.getAttribute('aria-busy') === 'true', 'pending reply');
      assert.equal(await page.eval(() => document.querySelector('textarea').disabled), true);
      await page.eval(() => document.querySelector('[data-ui="admin-review-reply"] form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      await page.eval(() => [...document.querySelectorAll('[role="dialog"] button')]
        .find((node) => node.textContent.trim() === 'Đóng').click());
      assert.equal(await page.eval(() => !!document.querySelector('[role="dialog"]')), true, 'Keep dialog open during save');
      assert.equal(state.writes.length, 1, 'Do not submit twice while saving');
      assert.equal(typeof state.release, 'function');
      state.release();
      await waitFor(page, () => !document.querySelector('textarea[name="adminReply"]')
        && document.querySelector('[data-ui="admin-review-reply"]')?.textContent.includes('Sửa phản hồi'), 'saved reply');
      assert.deepEqual(state.review.instructorReply, originalReview.instructorReply);
      assert.equal(state.review.updatedAt, dates.updatedAt);
      assert.equal(state.review.rating, originalReview.rating);

      await click(page, 'Sửa phản hồi');
      await waitFor(page, () => document.activeElement?.name === 'adminReply', 'edit field focused');
      await draft(page, 'Nội dung sẽ bị hủy');
      await click(page, 'Hủy');
      assert.equal(state.writes.length, 1, 'Cancel must not save');
      await click(page, 'Sửa phản hồi');
      const content = `Lỗi phát video đã được khắc phục. Bạn vui lòng tải lại trang.\n${'noidung'.repeat(30)}`;
      await draft(page, content);
      state.failNext = true;
      await click(page, 'Lưu thay đổi');
      await waitFor(page, () => !!document.querySelector('[data-ui="admin-review-reply"] [role="alert"]'), 'inline save error');
      assert.equal(await page.eval(() => document.querySelector('textarea').value), content, 'Keep draft on failure');
      await click(page, 'Lưu thay đổi');
      await waitFor(page, () => !document.querySelector('textarea[name="adminReply"]'), 'retry saved');
      await waitFor(page, () => !document.querySelector('[data-sonner-toast]'), 'transient notices cleared');
      await capture(page, '[data-ui="admin-review-reply"]', `saved-${width}.png`);
      const findings = await inspect(page);

      await click(page, 'Đóng');
      await openDetail(page);
      assert.equal(await page.eval((content) => document.querySelector('[data-ui="admin-review-reply"]').textContent.includes(content), content), true, 'Reply survives reload');
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page overflow');
      assert.equal(await page.eval(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog.scrollWidth <= dialog.clientWidth + 1;
      }), true, 'No dialog overflow');

      for (const role of ['student', 'guest']) {
        const reader = await fixturePage(width, state, role);
        try {
          await reader.page.goto(`${origin}/courses/${courseId}`, { timeoutMs: 60000, settleMs: 300 });
          await waitFor(reader.page, () => !!document.getElementById('tab-reviews'), 'course loaded');
          await reader.page.eval(() => document.getElementById('tab-reviews').click());
          await waitFor(reader.page, () => !!document.querySelector('#tabpanel-reviews article [data-ui="admin-review-reply-display"]'), 'public admin reply');
          assert.equal(await reader.page.eval(() => document.querySelector('#tabpanel-reviews article').textContent.includes('Phản hồi từ giảng viên')), true);
          if (role === 'student') {
            assert.equal(await reader.page.eval(() => !!document.querySelector('[data-ui="learner-review-zone"] [data-ui="admin-review-reply-display"]')), true, 'Owner sees reply in their review');
          }
          assert.equal(await reader.page.eval(() => [...document.querySelectorAll('#tabpanel-reviews button')]
            .some((node) => /phản hồi/i.test(node.getAttribute('aria-label') || node.textContent))), false, 'Readers cannot manage replies');
          assert.equal(await reader.page.eval(() => document.documentElement.scrollWidth <= innerWidth), true);
          await capture(reader.page, '#tabpanel-reviews article [data-ui="admin-review-reply-display"]', `${role}-${width}.png`);
          assert.deepEqual(reader.page.consoleErrors, []);
        } finally { await reader.close(); }
      }

      for (const status of ['hidden', 'deleted']) {
        state.review.status = status;
        state.review.deletedAt = status === 'deleted' ? '2026-11-20T12:00:00Z' : null;
        await openDetail(page);
        assert.equal(await page.eval(() => !!document.querySelector('textarea[name="adminReply"]')), false);
        assert.equal(await page.eval(() => [...document.querySelectorAll('[data-ui="admin-review-reply"] button')]
          .some((node) => /Sửa phản hồi|Gửi phản hồi/.test(node.textContent))), false, 'Hidden/deleted replies are read-only');
      }
      assert.deepEqual(state.errors, []);
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, create: true, edit: true, cancel: true, retryPreservesDraft: true,
        publicAndOwnerReply: true, keepsInstructorReply: true, readOnlyModeratedReviews: true,
        noOverflow: true, findings });
    } catch (error) {
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' }).catch(() => {});
      console.error(JSON.stringify({ width, writes: state.writes, errors: state.errors,
        runtimeErrors: page.consoleErrors, text: await page.eval(() => document.body.innerText).catch(() => '') }, null, 2));
      throw error;
    } finally { await fixture.close(); }
  }
  writeFileSync(join(out, before ? 'before.json' : 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ out, origin, production: Boolean(production), results: results.map(({ findings, ...result }) => ({
    ...result, findings: findings.map(({ level, id }) => ({ level, id })),
  })) }, null, 2));
} finally {
  await browser.close();
  production?.kill();
}
