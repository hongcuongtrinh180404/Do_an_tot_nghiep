import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Real player and learner API shapes, with every request intercepted: no real progress is written.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'student-video-quiz-browser');
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
  content: { type: 'video', url: `${origin}/student-quiz-fixture.mp4`, duration: 20 }, ...dates };
const question = { id: '607f1f77bcf86cd799439013', lessonId, revision: 'revision-single', timestamp: 3, order: 1,
  question: 'Đường chuyển sang màu nâu khi gặp điều kiện nào?', questionType: 'single',
  options: [{ id: 'a', label: 'A', text: 'Nhiệt độ cao' }, { id: 'b', label: 'B', text: 'Nhiệt độ thấp' }],
  answer: null, explanation: null };
const multiple = { ...question, id: '607f1f77bcf86cd799439015', revision: 'revision-multiple', timestamp: 4, order: 2,
  question: 'Phản ứng Maillard cần những thành phần nào?', questionType: 'multiple',
  options: [{ id: 'a', label: 'A', text: 'Đường khử' }, { id: 'b', label: 'B', text: 'Nước lạnh' },
    { id: 'c', label: 'C', text: 'Amino acid' }] };
const last = { ...question, id: '607f1f77bcf86cd799439016', revision: 'revision-last', timestamp: 12,
  question: 'Câu hỏi không có lời giải' };
const solutions = {
  [question.id]: { correctOptionIds: ['a'], explanation: 'Nhiệt độ cao làm đường caramel hóa.\nĐây là sự biến đổi của đường dưới tác dụng của nhiệt.' },
  [multiple.id]: { correctOptionIds: ['a', 'c'], explanation: 'Đường khử phản ứng với amino acid khi được làm nóng.' },
  [last.id]: { correctOptionIds: ['a'], explanation: null },
};
const videoPath = join(out, 'lecture.mp4');
const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'color=c=0x182222:s=160x90:r=4:d=20', '-an', '-c:v', 'libx264', '-tune', 'stillimage',
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

async function clickButton(page, label) {
  const point = await page.eval((label) => {
    const dialog = document.getElementById('student-quiz-title')?.closest('[role="dialog"]');
    const button = [...(dialog?.querySelectorAll('button') ?? [])].find((node) => node.textContent.trim() === label);
    if (!button || button.disabled) throw new Error(`Missing/disabled button: ${label}`);
    button.scrollIntoView({ block: 'nearest' });
    const r = button.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}

async function assertHidden(page) {
  assert.equal(await page.eval(() => {
    const dialog = document.getElementById('student-quiz-title').closest('[role="dialog"]');
    return !!dialog.querySelector('[aria-label="Đáp án đúng"], [aria-label="Đáp án bạn chọn chưa đúng"], [aria-label="Giải thích"], .border-emerald-600, .border-destructive');
  }), false, 'No answer key, feedback colours or explanation before disclosure');
}

async function checkLayout(page) {
  const metrics = await page.eval(() => {
    const dialog = document.getElementById('student-quiz-title').closest('[role="dialog"]');
    const rect = dialog.getBoundingClientRect();
    const footer = dialog.querySelector('footer').getBoundingClientRect();
    const buttons = [...dialog.querySelectorAll('footer button')].map((button) => {
      const r = button.getBoundingClientRect();
      return { label: button.textContent.trim(), x: r.x, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
    });
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      footer: { top: footer.top, bottom: footer.bottom }, buttons };
  });
  assert.ok(metrics.left >= -1 && metrics.right <= metrics.width + 1, 'Quiz fits horizontally');
  assert.ok(metrics.top >= -1 && metrics.bottom <= metrics.height + 1, 'Quiz fits vertically');
  assert.ok(metrics.scrollWidth <= metrics.width, 'No page overflow');
  for (const button of metrics.buttons) {
    assert.ok(button.x >= metrics.left && button.right <= metrics.right, `${button.label} fits inside the modal`);
    assert.ok(button.top >= metrics.footer.top && button.bottom <= metrics.footer.bottom, `${button.label} fits inside the footer`);
    if (metrics.width < 600) assert.ok(button.height >= 44, 'Mobile touch targets are at least 44px');
  }
  return metrics;
}

async function fixturePage(width) {
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600, reducedMotion: true });
  const state = { quizzes: structuredClone([question, multiple, last]), answers: [], requests: [], failNext: false };
  const progress = { courseId, revision: 1, watchedMs: 0, totalDurationMs: 20000, progressPercent: 0,
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
    source: `localStorage.setItem('accessToken','quiz-student-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/student-quiz-fixture.mp4' }] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const path = new URL(request.url).pathname;
    if (path === '/student-quiz-fixture.mp4') {
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
      const solution = solutions[quiz.id];
      quiz.answer = { ...payload,
        isCorrect: payload.selectedOptionIds.length === solution.correctOptionIds.length &&
          payload.selectedOptionIds.every((id) => solution.correctOptionIds.includes(id)),
        correctOptionIds: solution.correctOptionIds, submittedAt: dates.updatedAt };
      quiz.explanation = solution.explanation;
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
      : path.endsWith('/transcript') ? { lessonId, status: 'ready', durationSeconds: 20, sentences: [], rawTranscript: 'Bài giảng nấu ăn.' }
      : path.includes('/analysis/') ? null : [];
    return fulfill(requestId, data);
  });
  return { page, state, close: async () => { off(); await page.close(); } };
}

try {
  for (const width of [1440, 768, 390]) {
    const { page, state, close } = await fixturePage(width);
    try {
      await page.goto(`${origin}/courses/${courseId}/lessons/${lessonId}`, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, () => document.querySelector('video')?.duration === 20 &&
        !!document.querySelector('[data-checkpoint-time="3"]'), 'learner video and saved quiz requirements');
      if (width === 1440) {
        const fullscreen = await page.send('Runtime.evaluate', {
          expression: 'document.querySelector("video").parentElement.parentElement.requestFullscreen().then(() => true)',
          awaitPromise: true, returnByValue: true, userGesture: true,
        });
        assert.equal(fullscreen.result?.value, true);
      }
      await page.eval(() => document.querySelector('video').play());
      await waitFor(page, () => document.getElementById('student-quiz-title')?.textContent === 'Câu hỏi bắt buộc', 'natural playback opens mandatory quiz');
      await assertHidden(page);
      await clickButton(page, 'B.Nhiệt độ thấp');
      state.failNext = true;
      await clickButton(page, 'Trả lời');
      await waitFor(page, () => !!document.querySelector('[role="dialog"] [role="alert"]'), 'failed submission remains retryable');
      await assertHidden(page);
      await clickButton(page, 'Trả lời');
      await waitFor(page, () => !!document.querySelector('[role="dialog"] button[aria-expanded="false"]'), 'saved answer offers disclosure');
      await waitFor(page, () => document.activeElement?.textContent === 'Xem đáp án', 'focus moves to answer disclosure after submission');
      assert.equal(await page.eval(() => document.querySelector('video').paused), true);
      await assertHidden(page);
      const layout = await checkLayout(page);
      await page.screenshot({ path: join(out, `saved-${width}.png`), format: 'png' });
      await clickButton(page, 'Xem đáp án');
      await waitFor(page, () => !!document.querySelector('[role="dialog"] [aria-label="Giải thích"]'), 'answer explanation disclosed');
      assert.equal(await page.eval(() => document.querySelector('[role="dialog"] [aria-label="Giải thích"]').textContent.includes('caramel hóa')), true);
      await checkLayout(page);
      await page.eval(() => document.querySelector('[role="dialog"] [aria-label="Giải thích"]').scrollIntoView({ block: 'nearest' }));
      await page.eval(async () => {
        const dialog = document.getElementById('student-quiz-title').closest('[role="dialog"]');
        await Promise.all(dialog.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined)));
      });
      await page.screenshot({ path: join(out, `revealed-${width}.png`), format: 'png' });
      // Keyboard can collapse the disclosure without triggering player shortcuts.
      await page.eval(() => document.querySelector('[role="dialog"] button[aria-expanded]').focus());
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await waitFor(page, () => !!document.querySelector('[role="dialog"] button[aria-expanded="false"]'), 'keyboard collapses the disclosure');
      await assertHidden(page);
      await clickButton(page, 'Câu tiếp theo');
      await waitFor(page, (question) => document.querySelector('[role="dialog"] h2')?.textContent === question, 'next question only after clicking', multiple.question);
      await assertHidden(page);
      await clickButton(page, 'A.Đường khử');
      await clickButton(page, 'C.Amino acid');
      await clickButton(page, 'Trả lời');
      await waitFor(page, () => !!document.querySelector('[role="dialog"] button[aria-expanded="false"]'), 'multiple answer confirmed');
      await assertHidden(page);
      await clickButton(page, 'Xem đáp án');
      await waitFor(page, () => document.querySelector('[role="dialog"]')?.textContent.includes('Bạn đã trả lời đúng.'), 'correct multiple-answer feedback');
      await clickButton(page, 'Xem tiếp video');
      await waitFor(page, () => !document.getElementById('student-quiz-title') && !document.querySelector('video').paused, 'video resumes after continuation');
      // Native forward seeking still cannot bypass the next mandatory checkpoint.
      await page.eval(() => { document.querySelector('video').currentTime = 18; });
      await waitFor(page, (question) => document.querySelector('[role="dialog"] h2')?.textContent === question, 'remaining mandatory checkpoint blocks seek', last.question);
      await clickButton(page, 'A.Nhiệt độ cao');
      await clickButton(page, 'Trả lời');
      await waitFor(page, () => !!document.querySelector('[role="dialog"] button[aria-expanded="false"]'), 'last answer confirmed');
      await clickButton(page, 'Xem đáp án');
      await waitFor(page, () => !!document.querySelector('[role="dialog"] button[aria-expanded="true"]'), 'last answer disclosed');
      assert.equal(await page.eval(() => !!document.querySelector('[role="dialog"] [aria-label="Giải thích"]')), false, 'No empty explanation');
      await clickButton(page, 'Xem tiếp video');
      await waitFor(page, () => !document.getElementById('student-quiz-title') && document.querySelector('video').currentTime >= 18, 'original seek destination restored');
      await page.eval(() => {
        document.querySelector('video').pause();
        document.querySelector('[data-checkpoint-time="3"]').click();
      });
      await waitFor(page, () => document.getElementById('student-quiz-title')?.textContent === 'Ôn tập câu hỏi', 'completed quiz can reopen for review');
      await assertHidden(page);
      assert.equal(state.answers.length, 3, 'Disclosure never resubmits an answer');
      assert.equal(state.requests.some(({ path }) => path.endsWith('/quizzes/manage')), false, 'Learner never fetches management answer keys');
      assert.deepEqual(page.consoleErrors, [], 'No runtime exceptions');
      results.push({ width, layout, retry: true, explicitDisclosure: true, keyboard: true, multipleAnswers: true, seekEnforced: true });
    } finally {
      await close();
    }
  }
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
