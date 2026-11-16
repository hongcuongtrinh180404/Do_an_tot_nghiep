import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Exercise the running Next app and native video without touching real users, quizzes or progress.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'instructor-video-quiz-browser');
mkdirSync(out, { recursive: true });
const origin = process.env.QUIZ_PREVIEW_ORIGIN || 'http://localhost:3000';
const courseId = '6abf0202885b2bce17b4482e';
const lessonId = '6adada21ea90b87f17ec433e';
const sectionId = '607f1f77bcf86cd799439012';
const user = { id: '607f1f77bcf86cd799439014', role: 'instructor', fullName: 'Giảng viên kiểm thử',
  email: 'quiz-preview@example.test', isEmailVerified: true, status: 'active' };
const dates = { createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z' };
const course = { id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-nau-an', instructorId: user.id,
  description: '<p>Tìm hiểu các phản ứng hóa học trong nấu ăn.</p>', level: 'beginner', price: 0,
  status: 'draft', categoryId: 'category', ...dates };
const section = { id: sectionId, courseId, title: 'Phản ứng trong nấu ăn', order: 0, ...dates };
const lesson = { id: lessonId, sectionId, title: 'Caramel hóa và phản ứng Maillard', order: 0, isPreview: true,
  content: { type: 'video', url: `${origin}/instructor-quiz-fixture.mp4`, duration: 12 }, ...dates };
const question = { id: '607f1f77bcf86cd799439013', lessonId, timestamp: 3, order: 1,
  question: 'Đường chuyển sang màu nâu khi gặp điều kiện nào?', questionType: 'single',
  options: [
    { id: 'a', label: 'A', text: 'Nhiệt độ cao', isCorrect: true },
    { id: 'b', label: 'B', text: 'Nhiệt độ thấp', isCorrect: false },
  ],
  explanation: 'Nhiệt độ cao làm đường caramel hóa.',
};
const multiple = { ...question, id: '607f1f77bcf86cd799439015', timestamp: 4, order: 2,
  question: 'Phản ứng Maillard cần những thành phần nào?', questionType: 'multiple',
  options: [
    { id: 'a', label: 'A', text: 'Đường khử', isCorrect: true },
    { id: 'b', label: 'B', text: 'Nước lạnh', isCorrect: false },
    { id: 'c', label: 'C', text: 'Amino acid', isCorrect: true },
  ],
  explanation: 'Đường khử phản ứng với amino acid khi được làm nóng.',
};
const videoPath = join(out, 'lecture.mp4');
const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'color=c=0x182222:s=160x90:r=4:d=12', '-an', '-c:v', 'libx264', '-tune', 'stillimage',
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
  assert.equal(await page.eval((label) => {
    const dialog = document.querySelector('[role="dialog"]');
    const button = [...dialog.querySelectorAll('button')].find((item) => item.textContent.trim() === label);
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, label), true, `Button should be usable: ${label}`);
}

async function fixturePage(width) {
  const page = await browser.newPage({ width, height: 1000, mobile: width < 600, reducedMotion: true });
  const state = {
    quizzes: [structuredClone(question), structuredClone(multiple),
      { ...structuredClone(question), id: '607f1f77bcf86cd799439016', timestamp: 12, question: 'Câu hỏi cuối video' },
      { ...structuredClone(question), id: '607f1f77bcf86cd799439017', timestamp: null, question: 'Câu chưa đặt thời gian' }],
    requests: [], writes: [],
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
        message: status < 400 ? 'OK' : 'Unexpected API write in preview' })).toString('base64'),
    });
  }
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken','quiz-preview-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [
    { urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/instructor-quiz-fixture.mp4' },
  ] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const path = new URL(request.url).pathname;
    if (path === '/instructor-quiz-fixture.mp4') {
      const range = Object.entries(request.headers).find(([name]) => name.toLowerCase() === 'range')?.[1];
      const match = range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2] ? Math.min(Number(match[2]), video.length - 1) : video.length - 1;
      const body = video.subarray(start, end + 1);
      return page.send('Fetch.fulfillRequest', { requestId, responseCode: match ? 206 : 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'video/mp4' }, { name: 'Accept-Ranges', value: 'bytes' },
          { name: 'Content-Length', value: String(body.length) },
          ...(match ? [{ name: 'Content-Range', value: `bytes ${start}-${end}/${video.length}` }] : []),
        ], body: body.toString('base64') });
    }
    if (request.method === 'OPTIONS') return fulfill(requestId, null, 204);
    state.requests.push({ method: request.method, path });
    if (request.method !== 'GET') {
      state.writes.push({ method: request.method, path });
      return fulfill(requestId, null, 500);
    }
    const data = path.endsWith('/auth/me') ? user
      : path === `/api/v1/courses/${courseId}` ? course
      : path === `/api/v1/courses/public/${courseId}` ? { ...course, sections: [{ ...section, lessons: [lesson] }] }
      : path === `/api/v1/courses/${courseId}/sections` ? [section]
      : path === `/api/v1/sections/${sectionId}/lessons` ? [lesson]
      : path === `/api/v1/lessons/${lessonId}` ? lesson
      : path.endsWith('/quizzes/manage') ? state.quizzes
      : path.endsWith('/quizzes') ? state.quizzes.filter((quiz) => quiz.timestamp !== null).map((quiz) => ({
        ...quiz, revision: 'server-revision', answer: null, explanation: null,
        options: quiz.options.map(({ id, label, text }) => ({ id, label, text })),
      }))
      : path.endsWith('/transcript') ? { lessonId, status: 'ready', durationSeconds: 12, sentences: [], rawTranscript: 'Bài giảng nấu ăn.' }
      : path.includes('/learning-progress/') || path.includes('/analysis/') ? null : [];
    return fulfill(requestId, data);
  });
  return { page, state, close: async () => { off(); await page.close(); } };
}

async function enterLesson(page, mode = 'edit') {
  await page.goto(`${origin}/courses/${courseId}/lessons/${lessonId}?mode=${mode}`, { timeoutMs: 60000, settleMs: 300 });
  await waitFor(page, () => {
    const video = document.querySelector('video');
    return video?.duration === 12 && video.readyState >= 3 && !!document.querySelector('[data-checkpoint-time]');
  }, 'native video and quiz checkpoints ready');
}

try {
  for (const width of [1440, 768, 390]) {
    const { page, state, close } = await fixturePage(width);
    try {
      await enterLesson(page);
      assert.equal(await page.eval(() => document.querySelectorAll('[data-checkpoint-time]').length), 2);
      await page.eval(() => document.querySelector('video').play());
      await waitFor(page, () => document.getElementById('student-quiz-title')?.textContent === 'Làm thử câu hỏi', 'instructor question opens on natural playback');
      assert.equal(await page.eval(() => document.querySelector('video').paused), true);
      assert.ok(await page.eval(() => Math.abs(document.querySelector('video').currentTime - 3) < 0.1));
      assert.equal(await page.eval(() => document.activeElement?.getAttribute('role')), 'dialog');
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      assert.ok(await page.eval(() => Math.abs(document.querySelector('video').currentTime - 3) < 0.1), 'Video shortcuts must not bypass an open instructor quiz');
      assert.equal(await page.eval(() => [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].every((button) => !button.disabled)), true);
      const bounds = await page.eval(() => {
        const rect = document.querySelector('[role="dialog"]').getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
      });
      assert.ok(bounds.left >= 0 && bounds.right <= width && bounds.scrollWidth <= width, 'Quiz must fit the viewport');
      await page.screenshot({ path: join(out, `question-${width}.png`), format: 'png' });

      await clickButton(page, 'B.Nhiệt độ thấp');
      await clickButton(page, 'Trả lời');
      await waitFor(page, () => document.querySelector('[role="dialog"]')?.textContent.includes('Đáp án đúng được đánh dấu'), 'local incorrect-answer feedback');
      assert.equal(await page.eval(() => document.querySelector('[role="dialog"]').textContent.includes('Nhiệt độ cao làm đường caramel hóa.')), true);
      await clickButton(page, 'Câu tiếp theo');
      await clickButton(page, 'A.Đường khử');
      await clickButton(page, 'C.Amino acid');
      await clickButton(page, 'Trả lời');
      await waitFor(page, () => document.querySelector('[role="dialog"]')?.textContent.includes('Bạn đã trả lời đúng.'), 'local multiple-answer feedback');
      await page.screenshot({ path: join(out, `feedback-${width}.png`), format: 'png' });
      await clickButton(page, 'Xem tiếp video');
      await waitFor(page, () => !document.getElementById('student-quiz-title') && !document.querySelector('video').paused, 'resume video after trial');

      await page.eval(() => {
        const video = document.querySelector('video');
        video.pause();
        document.querySelector('[data-checkpoint-time="3"]').click();
      });
      await waitFor(page, () => [...document.querySelectorAll('[role="dialog"]')].some((dialog) => dialog.textContent.includes('Tạo câu hỏi tương tác video')), 'timeline marker still opens the editor');
      assert.equal(await page.eval(() => !!document.querySelector('[role="dialog"] input, [role="dialog"] textarea')), true);
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
      await waitFor(page, () => !document.querySelector('[role="dialog"]'), 'close editor without saving');

      await page.eval(() => { document.querySelector('video').currentTime = 1; });
      await sleep(150);
      await page.eval(() => document.querySelector('video').play());
      await waitFor(page, () => !!document.getElementById('student-quiz-title'), 'question reopens on backward replay');
      await clickButton(page, 'Bỏ qua');
      await page.eval(() => {
        const video = document.querySelector('video');
        video.pause();
        video.currentTime = 11.5;
      });
      await sleep(150);
      await page.eval(() => document.querySelector('video').play());
      await waitFor(page, () => document.querySelector('[role="dialog"]')?.textContent.includes('Câu hỏi cuối video'), 'end-of-video question');
      assert.deepEqual(state.writes, [], 'Instructor trials must never write to the backend');
      assert.equal(state.requests.some(({ path }) => path.includes('/learning-progress/')), false, 'Editor must not read or write learner progress');
      assert.deepEqual(page.consoleErrors, [], 'No browser runtime exceptions');
      results.push({ width, naturalPlayback: true, localGrading: true, editorPreserved: true, replay: true, endCheckpoint: true, writes: 0 });
    } finally {
      await close();
    }
  }

  const fixture = await fixturePage(1440);
  try {
    fixture.state.quizzes = [{ ...question, timestamp: 0 }];
    await enterLesson(fixture.page);
    const fullscreen = await fixture.page.send('Runtime.evaluate', {
      expression: 'document.querySelector("video").parentElement.parentElement.requestFullscreen().then(() => true)',
      awaitPromise: true, returnByValue: true, userGesture: true,
    });
    assert.equal(fullscreen.result?.value, true, 'Player can enter fullscreen');
    await fixture.page.eval(() => document.querySelector('video').play());
    await waitFor(fixture.page, () => document.getElementById('student-quiz-title')?.textContent === 'Làm thử câu hỏi', 'zero-second checkpoint');
    assert.equal(await fixture.page.eval(() => document.fullscreenElement?.contains(document.querySelector('[role="dialog"]'))), true, 'Instructor quiz stays visible inside fullscreen');
    await fixture.page.screenshot({ path: join(out, 'fullscreen-question.png'), format: 'png' });
    await clickButton(fixture.page, 'Bỏ qua');
    await waitFor(fixture.page, () => !document.getElementById('student-quiz-title') && document.querySelector('video').currentTime > 0.5, 'zero checkpoint does not loop');
    assert.deepEqual(fixture.state.writes, []);
    results.push({ zeroCheckpoint: true, noRepeatedPrompt: true, fullscreenQuizVisible: true });
  } finally {
    await fixture.close();
  }

  const learner = await fixturePage(1440);
  try {
    await enterLesson(learner.page, 'learn');
    await learner.page.eval(() => document.querySelector('video').play());
    await waitFor(learner.page, () => !!document.getElementById('student-quiz-title'), 'learner preview still opens');
    assert.equal(await learner.page.eval(() => document.getElementById('student-quiz-title').textContent), 'Ôn tập câu hỏi');
    assert.equal(await learner.page.eval(() => [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].every((button) => button.disabled)), true);
    assert.equal(learner.state.requests.some(({ path }) => path.endsWith('/quizzes/manage')), false, 'Learner mode must not request the management answer key');
    assert.deepEqual(learner.state.writes, []);
    results.push({ learnerPreviewReadOnly: true, managementAnswerKeyNotRequested: true });
  } finally {
    await learner.close();
  }
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
