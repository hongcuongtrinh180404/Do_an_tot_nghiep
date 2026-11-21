import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { probe, app as appProbe } from '../../.agents/skills/design-taste-frontend/scripts/lib/probe.mjs';
import { judge, judgeApp, APP_SKIP } from '../../.agents/skills/design-taste-frontend/scripts/lib/rules.mjs';

// Read-only browser fixtures: intercept every API request, never touch application data.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'admin-course-preview-browser');
mkdirSync(out, { recursive: true });
const before = process.argv.includes('--before');
const origin = process.env.COURSE_PREVIEW_ORIGIN || 'http://localhost:3000';
const videoPath = join(out, 'preview.mp4');
const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'color=c=0x182222:s=160x90:r=4:d=12', '-an', '-c:v', 'libx264', '-tune', 'stillimage',
  '-movflags', '+faststart', '-y', videoPath]);
assert.equal(generated.status, 0, generated.stderr?.toString());
const video = readFileSync(videoPath);
const courseId = '607f1f77bcf86cd799439011';
const sectionId = '607f1f77bcf86cd799439012';
const lessonId = '607f1f77bcf86cd799439013';
const secondLessonId = '607f1f77bcf86cd799439014';
const instructorId = '607f1f77bcf86cd799439015';
const dates = { createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' };
const course = {
  id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-trong-nau-an',
  instructorId, price: 200000, level: 'beginner', status: 'pending_approval',
  description: '<p>Tìm hiểu các phản ứng trong nấu ăn.</p>', studentsCount: 0, reviewCount: 0,
  instructor: { id: instructorId, fullName: 'Nguyễn Minh Anh', email: 'instructor@example.test' },
  ...dates,
};
const section = { id: sectionId, courseId, title: 'Nhiệt độ và thực phẩm', order: 0, ...dates };
const lessons = [lessonId, secondLessonId].map((id, order) => ({
  id, sectionId, title: order ? 'Thực hành kiểm soát nhiệt' : 'Sự biến đổi của protein',
  order, isPreview: false, materials: [], transcriptionStatus: 'ready',
  content: { type: 'video', duration: 12, url: `${origin}/course-preview-fixture.mp4` }, ...dates,
}));
const detail = () => ({ ...course, sections: [{ ...section, lessons: lessons.map((lesson) => ({
  id: lesson.id, title: lesson.title, order: lesson.order, isPreview: false, duration: 12, type: 'video',
})) }] });
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, arg) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await page.eval(predicate, arg)) return;
    await sleep(100);
  }
  await screenshot(page, 'failure.png');
  writeFileSync(join(out, 'failure.json'), JSON.stringify({
    label, errors: page.consoleErrors, body: await page.eval(() => document.body.innerText),
  }, null, 2));
  throw new Error(`Timed out: ${label}`);
}

async function inspect(page) {
  const metrics = await page.eval(probe);
  const appMetrics = await page.eval(appProbe);
  return [
    ...judge(metrics, { width: page.viewport.width })
      .filter((finding) => !APP_SKIP.has(finding.id)),
    ...judgeApp(appMetrics, metrics, { width: page.viewport.width }),
  ];
}

async function fixturePage(width, role = 'admin') {
  const page = await browser.newPage({ width, height: 1000, mobile: width < 600, reducedMotion: true });
  const user = { id: role === 'instructor' ? instructorId : '607f1f77bcf86cd799439016',
    fullName: 'Người kiểm thử', email: `${role}@example.test`, role, status: 'active', isEmailVerified: true };
  const reads = [];
  const writes = [];
  const errors = [];
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: role === 'guest'
      ? 'localStorage.clear();'
      : `localStorage.setItem('accessToken','course-preview-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [
    { urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/course-preview-fixture.mp4' },
  ] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const fulfill = (data, status = 200) => page.send('Fetch.fulfillRequest', {
      requestId, responseCode: status,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,PUT,DELETE,OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
      ],
      body: status === 204 ? '' : Buffer.from(JSON.stringify({
        success: status < 400, data, message: status < 400 ? 'OK' : 'Không tìm thấy khóa học',
      })).toString('base64'),
    });
    try {
      const path = new URL(request.url).pathname.replace('/api/v1', '');
      if (path === '/course-preview-fixture.mp4') {
        return await page.send('Fetch.fulfillRequest', {
          requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'video/mp4' }],
          body: video.toString('base64'),
        });
      }
      if (request.method === 'OPTIONS') return await fulfill(null, 204);
      if (request.method !== 'GET') {
        writes.push({ path, method: request.method });
        return await fulfill(null, 403);
      }
      reads.push(path);
      if (path === `/courses/public/${courseId}` && role !== 'admin' && course.status !== 'published') {
        return await fulfill(null, 404);
      }
      const list = { items: [course], total: 1, totalPages: 1, page: 1, limit: 10 };
      const data = path === '/auth/me' ? user
        : path === '/courses/admin' ? list
        : path === '/courses/admin/stats' ? { total: 1, published: 0, draft: 0, archived: 0, pendingApproval: 1 }
        : path === `/courses/public/${courseId}` ? detail()
        : path === `/courses/${courseId}` ? course
        : path === `/courses/${courseId}/sections` ? [section]
        : path === `/sections/${sectionId}/lessons` ? lessons
        : path === `/lessons/${lessonId}` ? lessons[0]
        : path === `/lessons/${secondLessonId}` ? lessons[1]
        : path.endsWith('/transcript') ? { status: 'ready', sentences: [] }
        : path === `/enrollments/check/${courseId}` ? { isEnrolled: false }
        : path.startsWith('/learning-progress/') ? null
        : path.endsWith('/mindmap') || path.endsWith('/summary') ? null
        : [];
      return await fulfill(data);
    } catch (error) {
      errors.push(String(error));
      await fulfill(null, 500).catch(() => {});
    }
  });
  return { page, reads, writes, errors, close: async () => { off(); await page.close(); } };
}

async function screenshot(page, name) {
  await page.screenshot({ path: join(out, name), format: 'png' });
}

try {
  for (const width of [1440, 768, 390]) {
    course.status = 'pending_approval';
    const fixture = await fixturePage(width);
    const { page } = fixture;
    try {
      await page.goto(`${origin}/admin/courses`, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, () => [...document.querySelectorAll('main a')].some((a) => a.textContent.trim() === 'Xem'), 'admin view link');
      const link = await page.eval(() => {
        const a = [...document.querySelectorAll('main a')].find((a) => a.textContent.trim() === 'Xem');
        return { href: a.getAttribute('href'), target: a.target, rel: a.rel, title: a.title };
      });
      if (before) {
        await screenshot(page, `before-list-${width}.png`);
        await page.goto(`${origin}/courses/${courseId}`, { timeoutMs: 60000, settleMs: 300 });
        await waitFor(page, () => !!document.querySelector('main h1'), 'learner course loaded');
        await screenshot(page, `before-detail-${width}.png`);
        results.push({ width, link, findings: await inspect(page) });
        continue;
      }

      assert.equal(link.href, `/courses/${courseId}`);
      assert.equal(link.target, '_blank');
      assert.ok(link.rel.includes('noopener') && link.rel.includes('noreferrer'));
      // Follow the actual link in the instrumented tab, preserving interception.
      await page.eval(() => {
        const a = [...document.querySelectorAll('main a')].find((a) => a.textContent.trim() === 'Xem');
        a.target = '_self';
        a.click();
      });
      await waitFor(page, () => !!document.querySelector('[data-ui="admin-course-preview"]'), 'admin learner preview');
      assert.equal(await page.eval(() => location.search), '');
      assert.equal(await page.eval(() => !!document.querySelector('main a[href*="mode=edit"]')), false);
      assert.equal(await page.eval(() => document.body.textContent.includes('Khóa học do bạn giảng dạy')), false);
      assert.equal(await page.eval(() => !!document.querySelector(`a[href="/admin/courses"]`)), true);
      assert.equal(await page.eval(({ courseId, lessonId }) =>
        !!document.querySelector(`a[href="/courses/${courseId}/lessons/${lessonId}"]`), { courseId, lessonId }), true);
      await screenshot(page, `after-detail-${width}.png`);
      const findings = await inspect(page);
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page overflow');

      await page.eval(() => document.querySelector('#tab-mindmap').click());
      await waitFor(page, () => !!document.querySelector('.react-flow__node-section button'), 'collapsed course section');
      await page.eval(() => document.querySelector('.react-flow__node-section button').click());
      await waitFor(page, () => !!document.querySelector('.react-flow__node-lesson'), 'course mindmap');
      await page.eval(() => document.querySelector('.react-flow__node-lesson').click());
      await waitFor(page, () => !!document.querySelector('video'), 'lesson player');
      assert.equal(await page.eval(() => location.search), '');
      assert.equal(await page.eval(() => document.body.textContent.includes('Chế độ học viên')), true);
      assert.equal(await page.eval(() => document.body.textContent.includes('Biên tập bài học')), false);
      assert.equal(await page.eval(() => !!document.querySelector('main a[href*="mode=edit"]')), false);
      await waitFor(page, () => document.querySelector('video')?.readyState >= 2, 'video metadata');
      await page.eval(() => document.querySelector('video').play());
      await waitFor(page, () => document.querySelector('video')?.currentTime > 0.5, 'read-only video playback');
      await page.eval(() => document.querySelector('video').pause());
      await screenshot(page, `after-lesson-${width}.png`);
      await page.eval(() => document.querySelector('#lesson-sidebar-tab-curriculum').click());
      await waitFor(page, () => [...document.querySelectorAll('button')].some((node) => node.textContent.includes('Thực hành kiểm soát nhiệt')), 'lesson navigation');
      await page.eval(() => [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Thực hành kiểm soát nhiệt')).click());
      await waitFor(page, (id) => location.pathname.endsWith(id) && !!document.querySelector('video'), 'second lesson', secondLessonId);
      assert.equal(await page.eval(() => location.search), '');
      assert.equal(fixture.reads.some((path) => path.endsWith('/quizzes/manage') || path === `/courses/${courseId}`), false, 'No editor data queries');
      assert.equal(fixture.reads.some((path) => path.startsWith('/learning-progress/')), false, 'Admin preview never requests enrollment progress');
      assert.deepEqual(fixture.writes, [], 'Preview must not write content, enrollment or learning progress');
      assert.deepEqual(fixture.errors, []);
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, link, findings });
    } finally {
      await fixture.close();
    }
  }

  if (!before) {
    const fixture = await fixturePage(1440);
    try {
      for (const status of ['published', 'draft', 'archived', 'pending_approval']) {
        course.status = status;
        await fixture.page.goto(`${origin}/courses/${courseId}`, { timeoutMs: 60000, settleMs: 100 });
        await waitFor(fixture.page, () => !!document.querySelector('[data-ui="admin-course-preview"]'), `${status} preview`);
        assert.equal(await fixture.page.eval(() => !!document.querySelector('main a[href*="mode=edit"]')), false);
      }
      assert.deepEqual(fixture.writes, []);
    } finally {
      await fixture.close();
    }
    course.status = 'published';
    for (const role of ['guest', 'student', 'instructor']) {
      const fixture = await fixturePage(1440, role);
      try {
        await fixture.page.goto(`${origin}/courses/${courseId}`, { timeoutMs: 60000, settleMs: 100 });
        await waitFor(fixture.page, () => !!document.querySelector('main h1'), `${role} course detail`);
        if (role !== 'guest') await waitFor(fixture.page, (owner) =>
          !!document.querySelector('[data-ui="instructor-alert"]') === owner
          && !!document.querySelector('button[aria-label="Menu tài khoản cá nhân"]'), `${role} authenticated`, role === 'instructor');
        assert.equal(await fixture.page.eval(() => !!document.querySelector('[data-ui="admin-course-preview"]')), false);
        assert.equal(await fixture.page.eval(() => !!document.querySelector('main a[href*="mode=edit"]')), role === 'instructor');
        assert.deepEqual(fixture.writes, []);
      } finally {
        await fixture.close();
      }
    }
  }
  writeFileSync(join(out, before ? 'before.json' : 'after.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: true, before, screenshots: out, results }, null, 2));
} finally {
  await browser.close();
}
