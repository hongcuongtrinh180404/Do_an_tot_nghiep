import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Use the real Next UI with intercepted API responses. Never write to application data.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'review-replies-browser');
mkdirSync(out, { recursive: true });
const origin = process.env.REVIEW_PREVIEW_ORIGIN || 'http://localhost:3000';
const instructorId = '607f1f77bcf86cd799439011';
const studentId = '607f1f77bcf86cd799439012';
const courseId = '607f1f77bcf86cd799439013';
const reviewId = '607f1f77bcf86cd799439014';
const dates = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const instructor = { id: instructorId, fullName: 'Giảng viên kiểm thử', email: 'instructor@example.test',
  role: 'instructor', status: 'active', isEmailVerified: true };
const course = { id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-trong-nau-an',
  instructorId, instructor, price: 0, level: 'beginner', status: 'published', sections: [],
  description: '<p>Tìm hiểu các phản ứng trong nấu ăn.</p>', ratingAvg: 4.5, reviewCount: 2, ...dates };
const originalReview = { id: reviewId, courseId, userId: studentId, rating: 4,
  comment: 'Mong giảng viên bổ sung thêm ví dụ thực hành.', status: 'visible', instructorReply: null,
  user: { id: studentId, fullName: 'Nguyễn Minh Anh' }, course: { id: courseId, title: course.title }, ...dates };
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, arg) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await page.eval(predicate, arg)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function clickButton(page, label, selector = 'main') {
  assert.equal(await page.eval(({ label, selector }) => {
    const button = [...(document.querySelector(selector)?.querySelectorAll('button') || [])]
      .find((item) => item.getAttribute('aria-label') === label || item.textContent.trim() === label);
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, { label, selector }), true, `Button should be usable: ${label}`);
}

async function draft(page, content) {
  await page.eval((content) => {
    const field = document.querySelector('textarea[name="reply"]');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, content);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }, content);
}

async function screenshotSection(page, selector, name) {
  await page.eval((selector) => {
    const element = document.querySelector(selector);
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 88, behavior: 'instant' });
  }, selector);
  await sleep(150);
  await page.screenshot({ path: join(out, name), format: 'png' });
}

async function fixturePage(width, state, role = 'instructor') {
  const page = await browser.newPage({ width, height: 1000, mobile: width < 600, reducedMotion: true });
  const user = role === 'instructor' ? instructor : { ...instructor, id: studentId, fullName: 'Nguyễn Minh Anh', role };
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken','review-test-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
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
      const url = new URL(request.url);
      const path = url.pathname.replace('/api/v1', '');
      if (request.method === 'OPTIONS') return await fulfill(requestId, null, 204);
      if (request.method !== 'GET') {
        state.writes.push({ method: request.method, path });
        if (path !== `/reviews/${reviewId}/reply` || !['POST', 'DELETE'].includes(request.method)) {
          state.unexpected.push(request);
          return await fulfill(requestId, null, 500);
        }
        if (state.hold) {
          state.hold = false;
          await new Promise((resolve) => { state.release = resolve; });
        }
        if (state.failNext) {
          state.failNext = false;
          return await fulfill(requestId, null, 403);
        }
        if (request.method === 'POST') {
          const payload = JSON.parse(request.postData);
          assert.deepEqual(Object.keys(payload), ['reply']);
          assert.equal(payload.reply, payload.reply.trim());
          state.review.instructorReply = {
            content: payload.reply, instructorId, instructorName: instructor.fullName,
            repliedAt: state.review.instructorReply?.repliedAt || '2026-11-16T12:00:00Z',
            updatedAt: state.review.instructorReply ? '2026-11-16T12:01:00Z' : null,
          };
        } else {
          state.review.instructorReply = null;
        }
        return await fulfill(requestId, state.review);
      }
      const reviews = [state.review, { ...structuredClone(originalReview), id: '607f1f77bcf86cd799439015',
        userId: '607f1f77bcf86cd799439016', rating: 5, comment: null,
        user: { id: '607f1f77bcf86cd799439016', fullName: 'Trần Thanh Hà' } }];
      const stats = { totalReviews: 2, averageRating: 4.5, distribution: [5, 4, 3, 2, 1].map((stars) => ({
        stars, count: reviews.filter((review) => review.rating === stars).length,
        percentage: reviews.filter((review) => review.rating === stars).length * 50,
      })) };
      const list = { items: reviews, total: reviews.length, page: 1, limit: 10, totalPages: 1 };
      const data = path === '/auth/me' ? user
        : path === '/courses/my-courses' ? [course]
        : path === '/instructor/teaching-stats/overview'
          ? { totalRevenue: 0, instructorEarnings: 0, successfulSales: 0, averageRating: 4.5, totalReviews: 2 }
        : path === '/instructor/teaching-stats/courses'
          ? { ...list, items: [{ ...course, totalRevenue: 0, instructorEarnings: 0, successfulSales: 0 }], total: 1 }
        : path === '/reviews/instructor/stats' || path === `/reviews/courses/${courseId}/stats` ? stats
        : path === '/reviews/instructor' || path === `/reviews/courses/${courseId}` ? list
        : path === `/courses/public/${courseId}` ? course
        : path === `/enrollments/check/${courseId}` ? { isEnrolled: false }
        : path.endsWith('/eligibility') ? { canReview: false, isEnrolled: false, progressPercent: 0, isInstructor: false, hasReviewed: true }
        : path.endsWith('/my-review') ? state.review
        : [];
      return await fulfill(requestId, data);
    } catch (error) {
      state.errors.push(String(error));
      await fulfill(requestId, null, 500).catch(() => {});
    }
  });
  return { page, close: async () => { off(); await page.close(); } };
}

try {
  for (const width of [1440, 768, 390]) {
    const state = { review: structuredClone(originalReview), writes: [], unexpected: [], errors: [], failNext: false, hold: false };
    const fixture = await fixturePage(width, state);
    const page = fixture.page;
    try {
      await page.goto(`${origin}/instructor/statistics`, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, () => [...document.querySelectorAll('main button')].some((button) => button.textContent.trim() === 'Phản hồi học viên'), 'instructor reviews loaded');
      await clickButton(page, 'Phản hồi học viên');
      await waitFor(page, () => document.activeElement?.name === 'reply', 'composer receives keyboard focus');
      assert.equal(await page.eval(() => document.querySelector('textarea').labels.length), 1);
      assert.equal(await page.eval(() => document.querySelector('textarea').maxLength), 2000);
      assert.equal(await page.eval(() => document.querySelector('form button[type="submit"]').disabled), true);
      await draft(page, 'x'.repeat(2001));
      assert.equal(await page.eval(() => document.querySelector('form button[type="submit"]').disabled), true);
      await draft(page, '  \n ');
      assert.equal(await page.eval(() => document.querySelector('form button[type="submit"]').disabled), true);
      await draft(page, '  Cảm ơn bạn. Tôi sẽ bổ sung ví dụ thực hành.\nHẹn gặp bạn ở bài tiếp theo.  ');
      await screenshotSection(page, '[aria-labelledby="section-recent-reviews"]', `composer-${width}.png`);

      state.hold = true;
      await clickButton(page, 'Gửi phản hồi');
      await waitFor(page, () => document.querySelector('main form')?.getAttribute('aria-busy') === 'true', 'pending reply');
      assert.equal(await page.eval(() => document.querySelector('textarea').disabled), true);
      assert.equal(await page.eval(() => [...document.querySelectorAll('main button')].filter((button) => button.textContent.trim() === 'Phản hồi học viên').every((button) => button.disabled)), true);
      for (let attempt = 0; attempt < 100 && !state.release; attempt++) await sleep(20);
      assert.equal(typeof state.release, 'function');
      state.release();
      await waitFor(page, () => !document.querySelector('textarea[name="reply"]') && document.querySelector('main').textContent.includes('Phản hồi của bạn'), 'saved reply');
      assert.equal(state.writes.length, 1, 'Exactly one request while saving');

      await clickButton(page, 'Sửa phản hồi cho Nguyễn Minh Anh');
      await draft(page, 'Nội dung sẽ bị hủy');
      await clickButton(page, 'Hủy');
      assert.equal(state.writes.length, 1, 'Cancel must not write');

      await clickButton(page, 'Sửa phản hồi cho Nguyễn Minh Anh');
      const updatedContent = `Cảm ơn bạn. Ví dụ thực hành đã được bổ sung.\n${'noidung'.repeat(30)}`;
      await draft(page, updatedContent);
      state.failNext = true;
      await clickButton(page, 'Gửi phản hồi');
      await waitFor(page, () => !!document.querySelector('form [role="alert"]'), 'failed-save error');
      assert.equal(await page.eval(() => document.querySelector('textarea').value), updatedContent, 'Keep draft on failure');
      await clickButton(page, 'Gửi phản hồi');
      await waitFor(page, () => !document.querySelector('textarea[name="reply"]'), 'retry saved');
      await screenshotSection(page, '[aria-labelledby="section-recent-reviews"]', `reply-${width}.png`);
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true, 'Instructor page must not overflow');

      const student = await fixturePage(width, state, 'student');
      try {
        await student.page.goto(`${origin}/courses/${courseId}`, { timeoutMs: 60000, settleMs: 300 });
        await waitFor(student.page, () => !!document.getElementById('tab-reviews'), 'public course loaded');
        await student.page.eval(() => document.getElementById('tab-reviews').click());
        await waitFor(student.page, () => document.getElementById('tabpanel-reviews')?.textContent.includes('Phản hồi từ giảng viên'), 'student can see reply');
        assert.equal(await student.page.eval(() => document.getElementById('tabpanel-reviews').textContent.includes('(Đã chỉnh sửa)')), false,
          'Reply must not mark the student review as edited');
        assert.equal(await student.page.eval(() => [...document.querySelectorAll('#tabpanel-reviews article p')].some((node) => node.textContent.startsWith('Cảm ơn bạn. Ví dụ thực hành đã được bổ sung.'))), true);
        assert.equal(await student.page.eval(() => [...document.querySelectorAll('#tabpanel-reviews button')].some((button) => /phản hồi/i.test(button.getAttribute('aria-label') || button.textContent))), false,
          'Students cannot manage instructor replies');
        await screenshotSection(student.page, '#tabpanel-reviews article', `student-${width}.png`);
        assert.equal(await student.page.eval(() => document.documentElement.scrollWidth <= innerWidth), true, 'Student page must not overflow');
        assert.deepEqual(student.page.consoleErrors, []);
      } finally { await student.close(); }

      await clickButton(page, 'Xóa phản hồi cho Nguyễn Minh Anh');
      await waitFor(page, () => !!document.querySelector('[role="dialog"]'), 'delete confirmation');
      await clickButton(page, 'Hủy', '[role="dialog"]');
      assert.ok(state.review.instructorReply, 'Cancel deletion keeps the reply');
      await clickButton(page, 'Xóa phản hồi cho Nguyễn Minh Anh');
      await waitFor(page, () => !!document.querySelector('[role="dialog"]'), 'reopen delete confirmation');
      await clickButton(page, 'Xóa phản hồi', '[role="dialog"]');
      await waitFor(page, () => !document.querySelector('[role="dialog"]') && !document.querySelector('main').textContent.includes('Phản hồi của bạn'), 'reply removed');
      assert.equal(state.review.instructorReply, null);
      assert.deepEqual(state.unexpected, []);
      assert.deepEqual(state.errors, []);
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, create: true, edit: true, cancel: true, delete: true, retryPreservesDraft: true,
        publicReply: true, noOverflow: true, noRuntimeErrors: true, requests: state.writes.length });
    } catch (error) {
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' }).catch(() => {});
      console.error(JSON.stringify({
        width, writes: state.writes, errors: state.errors,
        forms: await page.eval(() => [...document.querySelectorAll('form')].map((form) => ({
          busy: form.getAttribute('aria-busy'), text: form.textContent,
        }))).catch(() => []),
      }, null, 2));
      throw error;
    } finally { await fixture.close(); }
  }
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ out, results }, null, 2));
} finally {
  await browser.close();
}
