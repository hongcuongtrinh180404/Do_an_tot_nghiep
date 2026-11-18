import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// All lesson, enrollment and progress requests are intercepted. Never writes real learner data.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const before = process.argv.includes('--before');
const out = join(process.env.TASTE_SKILL_TMP, 'lesson-quiz-tab-browser', before ? 'before' : 'after');
mkdirSync(out, { recursive: true });
const origin = process.env.QUIZ_STUDENT_ORIGIN || 'http://localhost:3000';
const courseId = '77b9cd9815111ed2df8429c2';
const lessonId = 'd78ab96763caa0a338014dc5';
const sectionId = '607f1f77bcf86cd799439012';
const user = { id: '607f1f77bcf86cd799439014', role: 'student', fullName: 'Học viên kiểm thử',
  email: 'quiz-student@example.test', isEmailVerified: true, status: 'active' };
const dates = { createdAt: '2026-11-17T00:00:00Z', updatedAt: '2026-11-17T00:00:00Z' };
const course = { id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-nau-an', instructorId: 'instructor',
  description: '<p>Tìm hiểu các phản ứng hóa học trong nấu ăn.</p>', level: 'beginner', price: 0,
  status: 'published', categoryId: 'category', ...dates };
const section = { id: sectionId, courseId, title: 'Phản ứng trong nấu ăn', order: 0, ...dates };
const lesson = { id: lessonId, sectionId, title: 'Caramel hóa và phản ứng Maillard', order: 0, isPreview: true,
  content: { type: 'video', url: `${origin}/quiz-tab-fixture.mp4`, duration: 24 }, ...dates };
const quizzes = [
  'Điều kiện nào giúp đường chuyển sang màu nâu trong quá trình caramel hóa?',
  'Đâu là thành phần tham gia phản ứng Maillard?',
  'Vì sao cần kiểm soát nhiệt độ khi chế biến thực phẩm?',
  'Yếu tố nào làm thay đổi tốc độ phản ứng?',
  'Khi nào nên giảm nhiệt độ nấu?',
  'Điều gì tạo nên hương thơm khi nướng?',
].map((question, index) => ({
  id: `607f1f77bcf86cd79943902${index}`, lessonId, revision: `revision-${index}`, timestamp: [3, 7, 12, 16, 20, 23][index],
  order: index + 1, question, questionType: 'single',
  options: [
    { id: 'a', label: 'A', text: 'Nhiệt độ cao phù hợp với từng loại thực phẩm' },
    { id: 'b', label: 'B', text: 'Nhiệt độ thấp và không thay đổi trong suốt quá trình' },
    { id: 'c', label: 'C', text: 'Chỉ phụ thuộc vào lượng nước được thêm vào' },
    { id: 'd', label: 'D', text: 'Không có yếu tố nào ảnh hưởng đến phản ứng' },
  ],
  answer: null, explanation: null,
}));
const videoPath = join(out, 'lecture.mp4');
const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'color=c=0x182222:s=160x90:r=4:d=24', '-an', '-c:v', 'libx264', '-tune', 'stillimage',
  '-movflags', '+faststart', '-y', videoPath]);
assert.equal(generated.status, 0, generated.stderr?.toString());
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

async function click(page, selector) {
  const point = await page.eval((selector) => {
    const button = document.querySelector(selector);
    if (!button || button.disabled) throw new Error(`Missing/disabled button: ${selector}`);
    button.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = button.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}

async function openTab(page) {
  await waitFor(page, () => !!document.querySelector('[role="tablist"]') &&
    !!document.querySelector('[data-checkpoint-time="3"]'), 'hydrated lesson tabs and learner requirements');
  await page.eval(() => [...document.querySelectorAll('[role="tab"]')].find((node) => node.textContent.includes('Trắc nghiệm')).click());
  await waitFor(page, () => document.body.textContent.includes('Câu hỏi trắc nghiệm'), 'quiz tab');
}

async function screenshot(page, name, selector = '[data-student-quiz-tab]') {
  await page.eval((selector) => document.querySelector(selector)?.scrollIntoView({ block: 'start', behavior: 'instant' }), selector);
  await page.eval(() => document.fonts.ready.then(() => true));
  await page.screenshot({ path: join(out, name), format: 'png' });
}

async function fixturePage(width) {
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600, reducedMotion: true });
  const state = { quizzes: structuredClone(quizzes), answers: [], requests: [], failNext: false };
  const progress = { courseId, revision: 1, watchedMs: 0, totalDurationMs: 24000, progressPercent: 0,
    status: 'not_started', lastLessonId: lessonId, lastPositionSeconds: 0, updatedAt: dates.updatedAt };
  const completion = () => {
    const completedQuestions = state.quizzes.filter((quiz) => quiz.answer).length;
    return { courseId, lessonId, quizzesVersion: 'quizzes', mediaVersion: 'media', videoEnded: false,
      completedQuestions, totalQuestions: state.quizzes.length, quizzes: state.quizzes,
      status: completedQuestions === state.quizzes.length ? 'completed' : completedQuestions ? 'in_progress' : 'not_started' };
  };
  async function fulfill(requestId, data, status = 200) {
    return page.send('Fetch.fulfillRequest', { requestId, responseCode: status,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
      body: status === 204 ? '' : Buffer.from(JSON.stringify({ success: status < 400, data,
        message: status < 400 ? 'OK' : 'Không thể gửi câu trả lời. Vui lòng thử lại.' })).toString('base64'),
    });
  }
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `if(!sessionStorage.getItem('quiz-tab-fixture')){for(const key of Object.keys(localStorage)){if(key.startsWith('mindly:quiz-practice:'))localStorage.removeItem(key)}sessionStorage.setItem('quiz-tab-fixture','ready')}localStorage.setItem('accessToken','quiz-student-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/quiz-tab-fixture.mp4' }] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const path = new URL(request.url).pathname;
    if (path === '/quiz-tab-fixture.mp4') {
      const range = Object.entries(request.headers).find(([name]) => name.toLowerCase() === 'range')?.[1];
      const match = range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2] ? Math.min(Number(match[2]), video.length - 1) : video.length - 1;
      return page.send('Fetch.fulfillRequest', { requestId, responseCode: match ? 206 : 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'video/mp4' }, { name: 'Accept-Ranges', value: 'bytes' },
          { name: 'Content-Length', value: String(end - start + 1) },
          ...(match ? [{ name: 'Content-Range', value: `bytes ${start}-${end}/${video.length}` }] : []),
        ], body: video.subarray(start, end + 1).toString('base64') });
    }
    if (request.method === 'OPTIONS') return fulfill(requestId, null, 204);
    state.requests.push({ method: request.method, path });
    if (request.method === 'POST' && path.endsWith('/quiz-answers')) {
      if (state.failNext) { state.failNext = false; return fulfill(requestId, null, 500); }
      const payload = JSON.parse(request.postData);
      state.answers.push(payload);
      const quiz = state.quizzes.find((item) => item.id === payload.quizId);
      assert.equal(payload.quizRevision, quiz.revision);
      // Match production: the first saved answer wins.
      quiz.answer ??= { ...payload, isCorrect: payload.selectedOptionIds.length === 1 && payload.selectedOptionIds[0] === 'a',
        correctOptionIds: ['a'], submittedAt: dates.updatedAt };
      quiz.explanation = 'Nhiệt độ ảnh hưởng đến các phản ứng hóa học trong thực phẩm.\nKiểm soát nhiệt giúp tạo màu sắc và hương vị phù hợp.';
      quiz.explanationTimestamp = quiz.id === quizzes[0].id ? 0 : quiz.id === quizzes[2].id ? 9 : null;
      return fulfill(requestId, completion());
    }
    if (request.method === 'POST' && /\/(sessions|heartbeat|end)$/.test(path)) {
      const payload = JSON.parse(request.postData);
      return fulfill(requestId, { sessionId: payload.sessionId, expiresAt: '2099-01-01T00:00:00Z', progress });
    }
    if (request.method !== 'GET') return fulfill(requestId, null, 500);
    const data = path.endsWith('/auth/me') ? user
      : path === `/api/v1/courses/public/${courseId}` ? { ...course, sections: [{ ...section, lessons: [lesson] }] }
      : path === `/api/v1/courses/${courseId}` ? course
      : path === `/api/v1/courses/${courseId}/sections` ? [section]
      : path === `/api/v1/sections/${sectionId}/lessons` ? [lesson]
      : path === `/api/v1/lessons/${lessonId}` ? lesson
      : path === `/api/v1/learning-progress/courses/${courseId}` ? progress
      : path === `/api/v1/learning-progress/courses/${courseId}/lessons/${lessonId}` ? completion()
      : path === `/api/v1/learning-progress/courses/${courseId}/lessons` ? [completion()]
      : path.endsWith(`/enrollments/check/${courseId}`) ? { isEnrolled: true }
      : path.endsWith('/quizzes') ? state.quizzes
      : path.endsWith('/transcript') ? { lessonId, status: 'ready', durationSeconds: 24, sentences: [], rawTranscript: 'Bài giảng nấu ăn.' }
      : path.includes('/analysis/') ? null : [];
    return fulfill(requestId, data);
  });
  return { page, state, close: async () => { off(); await page.close(); } };
}

try {
  for (const width of [1440, 768, 390]) {
    const { page, state, close } = await fixturePage(width);
    try {
      const url = `${origin}/courses/${courseId}/lessons/${lessonId}`;
      await page.goto(url, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, () => document.querySelector('video')?.duration === 24, 'fixture video');
      await openTab(page);
      if (before) {
        await screenshot(page, `initial-${width}.png`, '[aria-label="Bảng chuyển đổi 3 Tab chi tiết bài học"]');
        continue;
      }
      await waitFor(page, () => document.querySelectorAll('[data-student-quiz]').length === 6, 'inline quiz cards');
      const card = (index) => `[data-student-quiz="${quizzes[index].id}"]`;
      const option = (index, id) => `${card(index)} button[data-option-id="${id}"]`;
      const check = (index) => `${card(index)} button[data-quiz-check]`;
      const feedback = (index) => `${card(index)} [data-quiz-feedback]`;
      const reset = '[data-quiz-reset]';
      assert.equal(await page.eval(() => document.querySelectorAll('[data-quiz-check], [data-quiz-feedback], [data-quiz-reset]').length), 0);
      await screenshot(page, `initial-${width}.png`);
      await click(page, option(0, 'a'));
      await click(page, option(0, 'b'));
      assert.equal(await page.eval((selector) => document.querySelector(selector).getAttribute('aria-pressed'), option(0, 'b')), 'true');
      await screenshot(page, `selected-${width}.png`);
      state.failNext = true;
      await click(page, check(0));
      await waitFor(page, () => !!document.querySelector('[data-student-quiz] [role="alert"]'), 'retryable error');
      assert.equal(await page.eval((selector) => !!document.querySelector(selector), feedback(0)), false);
      await click(page, check(0));
      await waitFor(page, (selector) => !!document.querySelector(selector), 'wrong answer feedback', feedback(0));
      assert.equal(await page.eval((selector) => document.querySelector(selector).disabled, option(0, 'a')), true);
      await screenshot(page, `wrong-${width}.png`);
      await click(page, `${feedback(0)} button`);
      await waitFor(page, () => !document.querySelector('video').paused && document.querySelector('video').currentTime < 2, 'zero timestamp seeks and plays');
      await page.eval(() => document.querySelector('video').pause());
      await click(page, option(2, 'a'));
      await click(page, check(2));
      await waitFor(page, (selector) => !!document.querySelector(selector), 'correct answer feedback', feedback(2));
      assert.equal(await page.eval(() => document.querySelector('[data-quiz-completed]').textContent.includes('2/6')), true);
      await screenshot(page, `correct-${width}.png`, card(2));
      await click(page, `${feedback(2)} button`);
      await waitFor(page, () => !!document.getElementById('student-quiz-title'), 'explanation seek respects mandatory checkpoint');
      assert.equal(await page.eval(() => document.querySelector('video').paused && Math.abs(document.querySelector('video').currentTime - 7) < 0.2), true);
      await page.eval(() => document.querySelector('[role="dialog"] [aria-label="Đóng câu hỏi"]').click());
      await click(page, reset);
      assert.equal(await page.eval(() => document.querySelectorAll('[data-quiz-check], [data-quiz-feedback], [data-quiz-reset]').length), 0);
      assert.equal(await page.eval(() => document.querySelector('[data-quiz-completed]').textContent.includes('2/6')), true);
      await page.goto(url, { timeoutMs: 60000, settleMs: 300 });
      await openTab(page);
      await waitFor(page, () => document.querySelectorAll('[data-student-quiz]').length === 6, 'reset restored after F5');
      assert.equal(await page.eval(() => document.querySelectorAll('[data-quiz-feedback], [data-quiz-check]').length), 0, 'F5 never reveals old answers after reset');
      assert.equal(await page.eval(() => document.querySelector('[data-quiz-completed]').textContent.includes('2/6')), true);
      await page.eval((selector) => document.querySelector(selector).focus(), option(0, 'a'));
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await waitFor(page, (selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true', 'keyboard selection', option(0, 'a'));
      await click(page, check(0));
      await waitFor(page, (selector) => document.querySelector(selector)?.textContent.includes('Bạn đã trả lời đúng'), 'practice uses new selection', feedback(0));
      assert.equal(state.answers.length, 2, 'Practice never rewrites completion or the original answer');
      await screenshot(page, `practice-${width}.png`);
      await page.eval(() => [...document.querySelectorAll('[role="tab"]')].find((node) => node.textContent.includes('Tóm tắt')).click());
      await openTab(page);
      await waitFor(page, (selector) => document.querySelector(selector)?.textContent.includes('Bạn đã trả lời đúng'), 'practice survives tab switching', feedback(0));
      await page.goto(url, { timeoutMs: 60000, settleMs: 300 });
      await openTab(page);
      await waitFor(page, (selector) => document.querySelector(selector)?.textContent.includes('Bạn đã trả lời đúng'), 'practice feedback survives F5', feedback(0));
      const layout = await page.eval(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        options: [...document.querySelectorAll('[data-student-quiz] button[data-option-id]')].map((node) => {
          const r = node.getBoundingClientRect();
          return { left: r.left, right: r.right, height: r.height };
        }),
      }));
      assert.ok(layout.scrollWidth <= layout.width, 'No horizontal page overflow');
      assert.ok(layout.options.every((r) => r.left >= 0 && r.right <= width && r.height >= 44), 'Options fit with accessible touch targets');
      assert.equal(state.requests.some(({ path }) => path.endsWith('/quizzes/manage')), false);
      assert.deepEqual(page.consoleErrors, [], 'No runtime exceptions');
      results.push({ width, resetKeepsCompletion: true, persistence: true, practiceGrading: true, guardedSeek: true, keyboard: true,
        layout: { scrollWidth: layout.scrollWidth, minTargetHeight: Math.min(...layout.options.map((r) => r.height)) } });
    } catch (failure) {
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' });
      writeFileSync(join(out, `failure-${width}.json`), JSON.stringify({
        message: failure.message, text: await page.eval(() => document.body.innerText),
        storage: await page.eval(() => ({ ...localStorage })), requests: state.requests, consoleErrors: page.consoleErrors,
      }, null, 2));
      throw failure;
    } finally {
      await close();
    }
  }
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ before, results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
