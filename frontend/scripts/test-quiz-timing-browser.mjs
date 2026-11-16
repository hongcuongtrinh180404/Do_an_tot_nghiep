import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Real frontend + native video; API writes are isolated fixtures.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'quiz-timing-browser');
mkdirSync(out, { recursive: true });
const origin = process.env.QUIZ_TIMING_ORIGIN || 'http://localhost:3000';
const courseId = '6abf0202885b2bce17b4482e';
const lessonId = '6adada21ea90b87f17ec433e';
const secondLessonId = '607f1f77bcf86cd799439015';
const sectionId = '607f1f77bcf86cd799439012';
const quizId = '607f1f77bcf86cd799439013';
const secondQuizId = '607f1f77bcf86cd799439016';
const user = { id: '607f1f77bcf86cd799439014', role: 'instructor', fullName: 'Giảng viên kiểm thử', email: 'quiz@example.test', isEmailVerified: true, status: 'active' };
const dates = { createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z' };
const course = { id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-nau-an', instructorId: user.id,
  description: '<p>Tìm hiểu các phản ứng hóa học trong nấu ăn.</p>', level: 'beginner', price: 0, status: 'draft', categoryId: 'category', ...dates };
const section = { id: sectionId, courseId, title: 'Phản ứng trong nấu ăn', order: 0, ...dates };
const lesson = { id: lessonId, sectionId, title: 'Caramel hóa và phản ứng Maillard', order: 0, isPreview: false,
  content: { type: 'video', url: `${origin}/quiz-timing-fixture.mp4`, duration: 120 }, ...dates };
const question = {
  id: quizId, lessonId, timestamp: null, explanationTimestamp: 27, order: 1,
  question: 'Phản ứng caramelization (chuyển hóa đường) xảy ra khi đường gặp điều kiện nào sau đây?',
  questionType: 'single',
  options: [
    { id: 'a', label: 'A', text: 'Nhiệt độ cao', isCorrect: true },
    { id: 'b', label: 'B', text: 'Độ ẩm thấp', isCorrect: false },
    { id: 'c', label: 'C', text: 'Môi trường ẩm ướt', isCorrect: false },
    { id: 'd', label: 'D', text: 'Môi trường axit nhẹ', isCorrect: false },
  ],
  explanation: 'Khi đến một mức nhiệt độ cao, đường tan chảy và chuyển dần sang màu nâu, tạo ra mùi vị đặc trưng.',
};
const videoPath = join(out, 'quiz-review.mp4');
const videoResult = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'color=c=0x182222:s=160x90:r=1:d=120', '-an', '-c:v', 'libx264', '-tune', 'stillimage', '-movflags', '+faststart', '-y', videoPath]);
assert.equal(videoResult.status, 0, videoResult.stderr?.toString());
const video = readFileSync(videoPath);
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, argument) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await page.eval(predicate, argument)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function enterTime(page, id, text, saveKey) {
  await page.eval(({ id, text }) => {
    const input = document.querySelector(`[data-quiz-timestamp="${id}"]`);
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, { id, text });
  await sleep(100);
  if (saveKey) {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: saveKey, code: saveKey });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: saveKey, code: saveKey });
  } else {
    await page.eval((id) => document.querySelector(`[data-quiz-timestamp="${id}"]`).blur(), id);
  }
}

async function scrollToQuiz(page) {
  await page.eval(() => document.querySelector('h2')?.scrollIntoView({ block: 'start' }));
  await sleep(150);
}

async function saveQuizSnapshot(page, state, width) {
  if (width !== 1440) return;
  // Preserve rendered production markup/CSS for the component-only visual inspector.
  // No scripts or API calls: interaction checks above/below use the real running app.
  const html = await page.eval(() => {
    const heading = [...document.querySelectorAll('h2')].find((node) => node.textContent === 'Câu hỏi trắc nghiệm');
    const root = heading.parentElement.parentElement.parentElement.cloneNode(true);
    for (const input of root.querySelectorAll('input')) {
      input.setAttribute('value', document.getElementById(input.id)?.value ?? '');
    }
    const styles = [...document.head.querySelectorAll('link[rel="stylesheet"], style')].map((node) => node.outerHTML).join('');
    return `<!doctype html><html lang="vi" class="${document.documentElement.className}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${location.origin}/">${styles}<style>body{margin:0;padding:16px}@media(min-width:640px){body{padding:24px}}</style></head><body class="${document.body.className}">${root.outerHTML}</body></html>`;
  });
  writeFileSync(join(out, `quiz-${state}.html`), html);
}

try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ width, height: 1000, mobile: width < 600, reducedMotion: true });
    let quizzes = [
      structuredClone(question),
      { ...structuredClone(question), id: secondQuizId, lessonId: secondLessonId, explanationTimestamp: 115, question: 'Phản ứng Maillard liên quan đến thành phần nào?' },
    ];
    const writes = [];
    let failNextSave = false;
    let approvalRequests = 0;
    let courseStatus = 'draft';
    const checklist = () => {
      const issues = quizzes.filter((quiz) => quiz.timestamp === null).map((quiz) => ({
        message: `Bài “${quiz.lessonId === lessonId ? lesson.title : 'Phản ứng Maillard'}”: chưa điền thời điểm xuất hiện cho câu “${quiz.question}”.`,
        target: { field: 'quiz-timestamps', sectionId, lessonId: quiz.lessonId, quizId: quiz.id },
      }));
      const items = [
        ...[
          ['title', 'Tên khóa học'], ['description', 'Mô tả chi tiết'], ['category-level', 'Danh mục và trình độ'],
          ['thumbnail', 'Ảnh thumbnail'], ['trailer', 'Video trailer'], ['curriculum', 'Chương và bài học hợp lệ'],
        ].map(([id, label]) => ({ id, label, complete: true, issues: [] })),
        { id: 'quiz-timestamps', label: 'Tất cả câu hỏi tương tác video đã có thời điểm xuất hiện hợp lệ', complete: !issues.length, issues },
      ];
      return { courseId, status: courseStatus, items, canSubmit: courseStatus === 'draft' && !issues.length };
    };
    async function fulfill(requestId, data, status = 200) {
      return page.send('Fetch.fulfillRequest', {
        requestId, responseCode: status,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
        body: status === 204 ? '' : Buffer.from(JSON.stringify({ success: status < 400, data,
          message: status < 400 ? 'OK' : 'Không thể lưu thời gian. Vui lòng thử lại.' })).toString('base64'),
      });
    }
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('accessToken','quiz-timing-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
    });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/quiz-timing-fixture.mp4' }] });
    const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      const path = new URL(request.url).pathname;
      if (path === '/quiz-timing-fixture.mp4') {
        const range = Object.entries(request.headers).find(([name]) => name.toLowerCase() === 'range')?.[1];
        const match = range?.match(/^bytes=(\d+)-(\d*)$/);
        const start = match ? Number(match[1]) : 0;
        const end = match?.[2] ? Math.min(Number(match[2]), video.length - 1) : video.length - 1;
        const body = video.subarray(start, end + 1);
        return page.send('Fetch.fulfillRequest', { requestId, responseCode: match ? 206 : 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'video/mp4' },
            { name: 'Accept-Ranges', value: 'bytes' },
            { name: 'Content-Length', value: String(body.length) },
            ...(match ? [{ name: 'Content-Range', value: `bytes ${start}-${end}/${video.length}` }] : []),
          ],
          body: body.toString('base64') });
      }
      if (request.method === 'OPTIONS') return fulfill(requestId, null, 204);
      if (request.method === 'PATCH' && path.endsWith('/timestamp')) {
        const id = path.split('/').at(-2);
        const body = JSON.parse(request.postData);
        writes.push({ id, ...body });
        if (failNextSave) { failNextSave = false; return fulfill(requestId, null, 500); }
        quizzes = quizzes.map((quiz) => quiz.id === id ? { ...quiz, timestamp: body.timestamp } : quiz);
        return fulfill(requestId, quizzes.find((quiz) => quiz.id === id));
      }
      if (request.method === 'POST' && path.endsWith('/request-approval')) {
        approvalRequests++;
        assert.equal(checklist().canSubmit, true, 'Approval may only be requested after every lesson is scheduled');
        courseStatus = 'pending_approval';
        return fulfill(requestId, { ...course, status: courseStatus });
      }
      if (request.method !== 'GET') throw new Error(`Unexpected API write: ${request.method} ${path}`);
      const routeLesson = path.includes(secondLessonId) ? { ...lesson, id: secondLessonId, title: 'Phản ứng Maillard', order: 1 } : lesson;
      const data = path.endsWith('/auth/me') ? user
        : path.endsWith('/approval-checklist') ? checklist()
        : path === `/api/v1/courses/${courseId}` ? { ...course, status: courseStatus }
        : path === `/api/v1/courses/${courseId}/sections` ? [section]
        : path === `/api/v1/sections/${sectionId}/lessons` ? [lesson, { ...lesson, id: secondLessonId, title: 'Phản ứng Maillard', order: 1 }]
        : path.endsWith('/quizzes/manage') ? quizzes.filter((quiz) => quiz.lessonId === routeLesson.id)
        : path === `/api/v1/lessons/${routeLesson.id}` ? routeLesson
        : path.endsWith('/transcript') ? { lessonId: routeLesson.id, status: 'ready', durationSeconds: 120, sentences: [], rawTranscript: 'Giải thích về caramel hóa.' }
        : path.includes('/analysis/') ? null : [];
      return fulfill(requestId, data);
    });
    try {
      await page.goto(`${origin}/courses/${courseId}/lessons/${lessonId}?mode=edit&quizId=${quizId}`, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, (id) => !!document.querySelector(`[data-quiz-timestamp="${id}"]`), 'quiz time input', quizId);
      assert.deepEqual(await page.eval((id) => {
        const input = document.querySelector(`[data-quiz-timestamp="${id}"]`);
        return [input.value, input.placeholder, input.getAttribute('aria-invalid')];
      }, quizId), ['', 'MM:SS', 'false']);
      assert.equal(await page.eval(() => document.querySelectorAll('[data-checkpoint-time]').length), 0);
      await waitFor(page, () => {
        const video = document.querySelector('video');
        return video?.duration === 120 && video.readyState >= 3 && video.seekable.length > 0 && video.seekable.end(0) >= 27;
      }, 'native video ready for seeking');
      await page.eval(() => document.querySelector('button[aria-label="Nghe lại phần giải thích tại 00:27"]').click());
      await waitFor(page, () => document.querySelector('video')?.currentTime === 27, 'native video seek to explanation');
      assert.equal(await page.eval(() => document.querySelector('video').currentTime), 27);
      await scrollToQuiz(page);
      await page.screenshot({ path: join(out, `empty-${width}.png`), format: 'png' });
      await saveQuizSnapshot(page, 'empty', width);

      await enterTime(page, quizId, '00:60');
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'true', 'format validation', quizId);
      assert.equal(writes.length, 0);
      await enterTime(page, quizId, '02:01');
      assert.equal(writes.length, 0, 'Out-of-duration input must not be submitted');
      await enterTime(page, quizId, '00:15', 'Escape');
      assert.equal(await page.eval((id) => document.querySelector(`[data-quiz-timestamp="${id}"]`).value, quizId), '');
      assert.equal(writes.length, 0, 'Escape must discard unsaved edits');
      await enterTime(page, quizId, '00:00', 'Enter');
      await waitFor(page, () => document.body.textContent.includes('Đã lưu'), 'zero saved');
      assert.equal(quizzes[0].timestamp, 0);
      assert.equal(quizzes[0].explanationTimestamp, 27);
      await enterTime(page, quizId, '');
      await waitFor(page, () => document.body.textContent.includes('Đã lưu'), 'cleared timing saved');
      assert.equal(quizzes[0].timestamp, null);
      failNextSave = true;
      await enterTime(page, quizId, '00:37');
      await waitFor(page, () => document.body.textContent.includes('Không thể lưu thời gian'), 'save error');
      assert.equal(quizzes[0].timestamp, null, 'Failed save must not invent a saved checkpoint');
      await enterTime(page, quizId, '00:37', 'Enter');
      await waitFor(page, () => document.body.textContent.includes('Đã lưu'), 'failed save retried');
      assert.equal(quizzes[0].timestamp, 37);
      await enterTime(page, quizId, '');
      await waitFor(page, () => document.body.textContent.includes('Đã lưu'), 'timing cleared before approval');
      assert.equal(quizzes[0].timestamp, null);

      await page.goto(`${origin}/courses/${courseId}?mode=edit`, { timeoutMs: 60000, settleMs: 200 });
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Yêu cầu phê duyệt'), 'approval action');
      await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Yêu cầu phê duyệt').click());
      await waitFor(page, () => document.querySelector('[data-approval-checklist-body]')?.textContent.includes('Tất cả câu hỏi tương tác'), 'course-wide timing checklist');
      assert.equal(await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Gửi yêu cầu').disabled), true);
      assert.equal(await page.eval(() => document.querySelectorAll('[data-approval-checklist-body] a[href*="quizId="]').length), 2);
      await page.screenshot({ path: join(out, `approval-${width}.png`), format: 'png' });
      await page.eval((id) => document.querySelector(`[data-approval-checklist-body] a[href*="quizId=${id}"]`).click(), quizId);
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'true', 'persistent red field', quizId);
      await scrollToQuiz(page);
      await page.screenshot({ path: join(out, `required-${width}.png`), format: 'png' });
      await saveQuizSnapshot(page, 'required', width);
      const metrics = await page.eval((id) => {
        const input = document.querySelector(`[data-quiz-timestamp="${id}"]`);
        const bounds = input.getBoundingClientRect();
        const style = getComputedStyle(input);
        return { width: innerWidth, left: bounds.left, right: bounds.right, pageWidth: document.documentElement.scrollWidth,
          border: style.borderColor, background: style.backgroundColor, invalid: input.getAttribute('aria-invalid') };
      }, quizId);
      assert.ok(metrics.left >= 0 && metrics.right <= width, 'Time input must fit viewport');
      assert.ok(metrics.pageWidth <= width, 'Page must not overflow horizontally');
      const placement = await page.eval((id) => {
        const input = document.querySelector(`[data-quiz-timestamp="${id}"]`);
        const header = input.parentElement.parentElement;
        const field = input.parentElement.getBoundingClientRect();
        const heading = header.querySelector('span').getBoundingClientRect();
        return { rightInset: header.getBoundingClientRect().right - field.right, topDifference: field.top - heading.top };
      }, quizId);
      assert.ok(placement.rightInset <= 1 && placement.topDifference <= 1, 'Appearance time stays in the upper-right corner');

      await enterTime(page, quizId, '00:37');
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'false', 'required error cleared', quizId);
      assert.equal(quizzes[0].timestamp, 37);
      await page.goto(`${origin}/courses/${courseId}/lessons/${secondLessonId}?mode=edit&quizId=${secondQuizId}`, { timeoutMs: 60000, settleMs: 200 });
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'true', 'errors persist in another lesson', secondQuizId);
      await enterTime(page, secondQuizId, '02:00');
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'false', 'end-of-video time saved', secondQuizId);
      await page.goto(`${origin}/courses/${courseId}?mode=edit`, { timeoutMs: 60000, settleMs: 200 });
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Yêu cầu phê duyệt'), 'approval after fixes');
      await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Yêu cầu phê duyệt').click());
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Gửi yêu cầu' && !button.disabled), 'approval enabled');
      assert.equal(approvalRequests, 0, 'No approval request while fixing incomplete quiz times');
      // Simulate another editor clearing a time after this checklist was displayed.
      quizzes[0].timestamp = null;
      await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Gửi yêu cầu').click());
      await waitFor(page, (id) => !!document.querySelector(`[data-approval-checklist-body] a[href*="quizId=${id}"]`), 'latest checklist issues loaded', quizId);
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Gửi yêu cầu' && button.disabled), 'stale checklist blocked');
      assert.equal(approvalRequests, 0, 'Refresh-before-submit must block newly missing timing');
      await page.eval((id) => document.querySelector(`[data-approval-checklist-body] a[href*="quizId=${id}"]`).click(), quizId);
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'true', 'stale timing highlighted', quizId);
      await enterTime(page, quizId, '00:37');
      await waitFor(page, (id) => document.querySelector(`[data-quiz-timestamp="${id}"]`)?.getAttribute('aria-invalid') === 'false', 'stale timing corrected', quizId);
      await page.goto(`${origin}/courses/${courseId}?mode=edit`, { timeoutMs: 60000, settleMs: 200 });
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Yêu cầu phê duyệt'), 'approval after stale timing corrected');
      await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Yêu cầu phê duyệt').click());
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Gửi yêu cầu' && !button.disabled), 'all timing valid again');
      await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Gửi yêu cầu').click());
      await waitFor(page, () => document.body.textContent.includes('Đã gửi yêu cầu phê duyệt'), 'approval submitted successfully');
      assert.equal(approvalRequests, 1);
      assert.equal(courseStatus, 'pending_approval');
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, status: 'PASS', writes: writes.length, nativeVideoSeek: 27, approvalRequests, metrics, placement });
    } catch (error) {
      const details = await page.eval(() => {
        const video = document.querySelector('video');
        return { url: location.href, text: document.body.innerText.slice(-5000),
          video: video ? { currentTime: video.currentTime, duration: video.duration,
            readyState: video.readyState, error: video.error?.message, seekable: [...Array(video.seekable.length)].map((_, index) => [video.seekable.start(index), video.seekable.end(index)]) } : null };
      });
      writeFileSync(join(out, `failure-${width}.json`), JSON.stringify({ details, errors: page.consoleErrors }, null, 2));
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' });
      throw error;
    } finally {
      off();
      await page.close();
    }
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
