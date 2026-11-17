import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Isolated API fixtures: exercise the real page, ReactFlow and browser layout.
process.env.TASTE_SKILL_TMP ??= join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'lesson-mindmap-tabs');
mkdirSync(out, { recursive: true });
const origin = process.env.MINDMAP_TEST_ORIGIN ?? 'http://localhost:3000';
const courseId = '77b9cd9815111ed2df8429c2';
const lessonId = 'd78ab96763caa0a338014dc5';
const sectionId = '607f1f77bcf86cd799439012';
const tree = {
  id: 'root', title: 'Sơ đồ bài học kiểm thử', timestamp: 0,
  children: Array.from({ length: 6 }, (_, branch) => ({
    id: `branch-${branch}`, title: `Chủ đề ${branch + 1}`, timestamp: branch * 20,
    children: Array.from({ length: 8 }, (_, leaf) => ({
      id: `leaf-${branch}-${leaf}`, title: `Kiến thức ${branch + 1}.${leaf + 1}`, timestamp: branch * 20 + leaf,
    })),
  })),
};
const mindmap = { id: 'mindmap', lessonId, mindmap: { root: tree } };
const summary = { id: 'summary', lessonId, summary: {
  title: 'Tóm tắt bài học', overview: 'Nội dung tóm tắt để kiểm thử chuyển tab.',
  keyPoints: Array.from({ length: 8 }, (_, i) => ({
    title: `Ý chính ${i + 1}`, content: 'Nội dung kiến thức có liên kết đến thời gian bài giảng.', timestamp: i * 10,
  })),
} };
const browser = await Browser.launch();

async function waitFor(page, predicate, label) {
  for (let i = 0; i < 150; i++) {
    if (await page.eval(predicate)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function clickText(page, text) {
  await page.eval((text) => {
    const button = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === text && el.checkVisibility());
    if (!button) throw new Error(`Missing visible button: ${text}`);
    button.click();
  }, text);
}

async function clickTitle(page, title) {
  await page.eval((title) => {
    const button = [...document.querySelectorAll('button')].find((el) => el.title === title && el.checkVisibility());
    if (!button) throw new Error(`Missing visible button: ${title}`);
    button.click();
  }, title);
}

async function observeFrames(page, action) {
  return page.eval(async (action) => {
    const panel = document.querySelector('[role="tablist"]').parentElement.nextElementSibling;
    const samples = [];
    const emptyStates = [];
    const observer = new MutationObserver(() => {
      if (panel.textContent.includes('Chưa có sơ đồ tư duy')) emptyStates.push(performance.now());
    });
    observer.observe(panel, { childList: true, subtree: true });
    if (action) [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === action && el.checkVisibility()).click();
    for (let i = 0; i < 45; i++) {
      await new Promise(requestAnimationFrame);
      samples.push({
        time: performance.now(),
        height: panel.getBoundingClientRect().height,
        scrollY,
        transform: document.querySelector('.react-flow__viewport')?.style.transform,
      });
    }
    observer.disconnect();
    return { samples, emptyStates };
  }, action);
}

async function fixture(width) {
  const instructor = width >= 1000;
  const user = { id: '607f1f77bcf86cd799439014', role: instructor ? 'instructor' : 'student',
    fullName: 'Mindmap Test User', email: 'mindmap@example.test', status: 'active', isEmailVerified: true };
  const course = { id: courseId, instructorId: user.id, title: 'Khóa học kiểm thử', status: 'published', price: 0 };
  const lesson = { id: lessonId, sectionId, title: 'Bài học Mindmap', order: 0, isPreview: true,
    content: { type: 'video', url: `${origin}/mindmap-fixture.mp4`, duration: 120 } };
  const section = { id: sectionId, courseId, title: 'Chương 1', order: 0, lessons: [lesson] };
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600 });
  const pending = [];
  const writes = [];
  let mindmapRequests = 0;
  let ready = false;
  const fulfill = (requestId, data, responseCode = 200) => page.send('Fetch.fulfillRequest', {
    requestId, responseCode,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: origin },
      { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
    ],
    body: responseCode === 204 ? '' : Buffer.from(JSON.stringify({ success: true, data })).toString('base64'),
  });
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken','mindmap-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/mindmap-fixture.mp4' }] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const path = new URL(request.url).pathname;
    if (request.method === 'OPTIONS' || path.endsWith('/mindmap-fixture.mp4')) return fulfill(requestId, null, 204);
    if (request.method !== 'GET') {
      writes.push({ method: request.method, path });
      return fulfill(requestId, null, 500);
    }
    if (path.endsWith('/analysis/mindmap')) {
      mindmapRequests++;
      if (!ready) return pending.push(requestId);
      return fulfill(requestId, mindmap);
    }
    const data = path.endsWith('/auth/me') ? user
      : path === `/api/v1/courses/${courseId}` ? course
      : path === `/api/v1/courses/public/${courseId}` ? { ...course, sections: [section] }
      : path === `/api/v1/courses/${courseId}/sections` ? [section]
      : path === `/api/v1/sections/${sectionId}/lessons` ? [lesson]
      : path === `/api/v1/lessons/${lessonId}` ? lesson
      : path.endsWith('/analysis/summary') ? summary
      : path.endsWith('/transcript') ? { lessonId, status: 'ready', durationSeconds: 120, sentences: [] }
      : path.includes('/learning-progress/') || path.includes('/completion') ? null : [];
    return fulfill(requestId, data);
  });
  return {
    page, writes, mode: instructor ? 'edit' : 'learn',
    requests: () => mindmapRequests,
    release: async () => {
      ready = true;
      await Promise.all(pending.splice(0).map((id) => fulfill(id, mindmap)));
    },
    close: async () => { off(); await page.close(); },
  };
}

try {
  for (const width of [1440, 390]) {
    const { page, mode, release, requests, writes, close } = await fixture(width);
    try {
      await page.goto(`${origin}/courses/${courseId}/lessons/${lessonId}?mode=${mode}`, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, () => document.body.textContent.includes('Nội dung tóm tắt để kiểm thử chuyển tab.'), 'summary data');
      const previousHeight = await page.eval(() => {
        const nav = document.querySelector('[role="tablist"]');
        nav.scrollIntoView({ block: 'start' });
        return nav.parentElement.nextElementSibling.getBoundingClientRect().height;
      });
      await clickText(page, 'Sơ đồ tư duy (Mindmap)');
      await waitFor(page, () => document.body.textContent.includes('Đang tải sơ đồ tư duy'), 'cold loading');
      const loadingHeight = await page.eval(() => document.querySelector('[role="tablist"]').parentElement.nextElementSibling.getBoundingClientRect().height);
      assert.ok(loadingHeight >= previousHeight - 1, 'Loading preserves the outgoing panel height');
      await release();
      await waitFor(page, () => document.body.textContent.includes('Kiến thức 6.8'), '55-node mindmap');
      const treeHeight = await page.eval(() => document.querySelector('[role="tablist"]').parentElement.nextElementSibling.getBoundingClientRect().height);
      await clickText(page, 'Tóm tắt (Summary)');
      const revisit = await observeFrames(page, 'Sơ đồ tư duy (Mindmap)');
      assert.equal(revisit.emptyStates.length, 0, 'No intermediate empty state');
      assert.ok(revisit.samples.every((frame) => frame.height >= treeHeight - 1), 'Cached tree never collapses to the loading height');
      assert.equal(requests(), 1, 'Tab revisits reuse fresh query data');

      await clickText(page, 'Sơ đồ Mindmap');
      await waitFor(page, () => document.querySelectorAll('.react-flow__node').length === 7, 'collapsed canvas nodes');
      const initial = await observeFrames(page);
      assert.equal(new Set(initial.samples.slice(3).map((frame) => frame.transform)).size, 1,
        'Initial canvas has no delayed zoom animation');
      await clickTitle(page, 'Phóng to (Zoom In)');
      await observeFrames(page);
      const viewport = await page.eval(() => {
        window.retainedCanvas = document.querySelector('.react-flow');
        return document.querySelector('.react-flow__viewport').style.transform;
      });
      await clickText(page, 'Trắc nghiệm (Quiz)');
      const canvasReturn = await observeFrames(page, 'Sơ đồ tư duy (Mindmap)');
      assert.equal(await page.eval(() => document.querySelector('.react-flow') === window.retainedCanvas), true,
        'ReactFlow remains mounted between tabs');
      assert.ok(canvasReturn.samples.every((frame) => frame.transform === viewport), 'Reopening preserves user zoom without refitting');

      await clickTitle(page, 'Mở rộng tất cả nhánh');
      await clickText(page, 'Tóm tắt (Summary)');
      await clickText(page, 'Sơ đồ tư duy (Mindmap)');
      await waitFor(page, () => document.querySelectorAll('.react-flow__node').length === 55, 'resume interrupted expansion');
      await observeFrames(page);
      await clickTitle(page, 'Thu gọn tất cả nhánh');
      await waitFor(page, () => document.querySelectorAll('.react-flow__node').length === 7, 'collapse canvas');
      await observeFrames(page);
      await clickTitle(page, 'Toàn màn hình');
      await observeFrames(page);
      const fullscreen = await page.eval(() => {
        const canvas = document.querySelector('.react-flow').closest('.fixed');
        const r = canvas.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height, screenWidth: innerWidth, screenHeight: innerHeight };
      });
      assert.equal(fullscreen.left, 0);
      assert.equal(fullscreen.top, 0);
      assert.equal(fullscreen.width, fullscreen.screenWidth);
      assert.equal(fullscreen.height, fullscreen.screenHeight);
      await page.screenshot({ path: join(out, `fullscreen-${width}.png`), format: 'png' });
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
      await waitFor(page, () => !document.querySelector('.react-flow')?.closest('.fixed'), 'exit fullscreen');
      await observeFrames(page);
      await page.eval(() => document.querySelector('.react-flow').scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: join(out, `canvas-${width}.png`), format: 'png' });
      assert.deepEqual(writes, [], 'No server writes');
      assert.deepEqual(page.consoleErrors, [], 'No browser exceptions');
      console.log(`PASS ${width}px (${mode}): cold loading, cached tree, canvas viewport, interrupted expansion, fullscreen/Escape`);
    } finally {
      await close();
    }
  }
  console.log(`Screenshots: ${out}`);
} finally {
  await browser.close();
}
