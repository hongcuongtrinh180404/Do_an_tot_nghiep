import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Real browser and native Fullscreen API; every API read/write uses isolated in-memory fixtures.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'video-quiz-editor-browser');
mkdirSync(out, { recursive: true });
const origin = process.env.QUIZ_EDITOR_ORIGIN || 'http://localhost:3000';
const courseId = '6abf0202885b2bce17b4482e';
const lessonId = '6adada21ea90b87f17ec433e';
const sectionId = '607f1f77bcf86cd799439012';
const user = { id: '607f1f77bcf86cd799439014', role: 'instructor', fullName: 'Giảng viên kiểm thử',
  email: 'quiz-editor@example.test', isEmailVerified: true, status: 'active' };
const dates = { createdAt: '2026-11-17T00:00:00Z', updatedAt: '2026-11-17T00:00:00Z' };
const course = { id: courseId, title: 'Khoa học trong nấu ăn', slug: 'khoa-hoc-nau-an', instructorId: user.id,
  description: '<p>Các phản ứng hóa học trong nấu ăn.</p>', level: 'beginner', price: 0,
  status: 'draft', categoryId: 'category', ...dates };
const section = { id: sectionId, courseId, title: 'Phản ứng trong nấu ăn', order: 0, ...dates };
const lesson = { id: lessonId, sectionId, title: 'Caramel hóa và phản ứng Maillard', order: 0, isPreview: true,
  content: { type: 'video', url: `${origin}/quiz-editor-fixture.mp4`, duration: 120 }, ...dates };
const question = { id: '607f1f77bcf86cd799439013', lessonId, timestamp: 20, explanationTimestamp: 12, order: 1,
  question: 'Đường chuyển sang màu nâu khi gặp điều kiện nào?', questionType: 'single',
  options: [
    { id: 'a', label: 'A', text: 'Nhiệt độ cao', isCorrect: true },
    { id: 'b', label: 'B', text: 'Nhiệt độ thấp', isCorrect: false },
  ], explanation: 'Nhiệt độ cao làm đường caramel hóa.' };
const second = { ...question, id: '607f1f77bcf86cd799439015', timestamp: 21, explanationTimestamp: 15, order: 2 };
const destination = { ...question, id: '607f1f77bcf86cd799439016', timestamp: 80, explanationTimestamp: 72 };
const videoPath = join(out, 'lecture.mp4');
const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'color=c=0x182222:s=160x90:r=1:d=120', '-an', '-c:v', 'libx264', '-tune', 'stillimage',
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
    const node = document.querySelector(selector);
    if (!node || node.disabled) throw new Error(`Missing/disabled control: ${selector}`);
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = node.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}

async function clickText(page, text) {
  const selector = await page.eval((text) => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === text && !node.disabled && node.getClientRects().length);
    if (!button) throw new Error(`Missing button: ${text}`);
    button.setAttribute('data-browser-click', 'target');
    return '[data-browser-click="target"]';
  }, text);
  await click(page, selector);
  await page.eval(() => document.querySelector('[data-browser-click]')?.removeAttribute('data-browser-click'));
}

async function fill(page, selector, value) {
  await page.eval(({ selector, value }) => {
    const input = document.querySelector(selector);
    if (!input) throw new Error(`Missing input: ${selector}`);
    input.focus();
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, { selector, value });
  await page.eval((selector) => document.querySelector(selector)?.blur(), selector);
}

async function setTime(page, label, minutes, seconds) {
  await fill(page, `input[aria-label="${label} - Phút"]`, minutes);
  await fill(page, `input[aria-label="${label} - Giây"]`, seconds);
}

async function times(page) {
  return page.eval(() => [...document.querySelectorAll('[data-slot="dialog-content"] input[aria-label*=" - "]')].map((node) => node.value));
}

async function enterFullscreen(page) {
  const response = await page.send('Runtime.evaluate', {
    expression: 'document.querySelector("video").parentElement.parentElement.requestFullscreen().then(() => true)',
    awaitPromise: true, returnByValue: true, userGesture: true,
  });
  assert.equal(response.result?.value, true, 'Native player fullscreen is available');
  await waitFor(page, () => !!document.fullscreenElement, 'fullscreen state');
}

async function editorVisible(page) {
  await waitFor(page, () => !!document.querySelector('input[aria-label="Thời điểm xuất hiện - Giây"]'), 'shared timing fields');
  // Base UI's entering popup can exist in the DOM before its zoom/fade has settled.
  await sleep(150);
  const metrics = await page.eval(() => {
    const dialog = document.querySelector('[data-slot="dialog-content"]');
    const rect = dialog.getBoundingClientRect();
    const time = dialog.querySelector('input[aria-label="Thời điểm xuất hiện - Giây"]').getBoundingClientRect();
    const topElement = document.elementFromPoint(time.x + time.width / 2, time.y + time.height / 2);
    return { inFullscreen: !document.fullscreenElement || document.fullscreenElement.contains(dialog),
      overlayInFullscreen: !document.fullscreenElement || document.fullscreenElement.contains(document.querySelector('[data-slot="dialog-overlay"]')),
      interactive: dialog.contains(topElement), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: innerWidth, height: innerHeight };
  });
  assert.equal(metrics.inFullscreen, true, 'Editor is a descendant of the fullscreen player');
  assert.equal(metrics.overlayInFullscreen, true, 'Editor backdrop stays inside fullscreen');
  assert.equal(metrics.interactive, true, 'Time fields are visible and receive pointer input');
  assert.ok(metrics.left >= -1 && metrics.right <= metrics.width + 1 && metrics.top >= -1 && metrics.bottom <= metrics.height + 1,
    `Editor fits the viewport: ${JSON.stringify(metrics)}`);
  return metrics;
}

async function fixture(width) {
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600, reducedMotion: true });
  const state = { quizzes: structuredClone([question, second, destination]), writes: [], unexpectedWrites: [] };
  async function fulfill(requestId, data, status = 200) {
    return page.send('Fetch.fulfillRequest', { requestId, responseCode: status,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
      body: status === 204 ? '' : Buffer.from(JSON.stringify({ success: status < 400, data, message: 'Fixture' })).toString('base64'),
    });
  }
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken','quiz-editor-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }, { urlPattern: '*://*/quiz-editor-fixture.mp4' }] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const path = new URL(request.url).pathname;
    if (path === '/quiz-editor-fixture.mp4') {
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
    if (request.method === 'PUT' && path.endsWith('/quizzes/sync')) {
      const payload = JSON.parse(request.postData);
      state.writes.push(payload);
      const source = state.quizzes.filter((quiz) => quiz.timestamp !== null && Math.abs(quiz.timestamp - payload.timestamp) <= 2);
      const retained = new Set(payload.questions.filter((quiz) => quiz.id).map((quiz) => quiz.id));
      assert.ok([...retained].every((id) => source.some((quiz) => quiz.id === id)), 'Retained IDs belong to the original checkpoint');
      state.quizzes = state.quizzes.filter((quiz) => !source.includes(quiz) || retained.has(quiz.id));
      for (const [index, incoming] of payload.questions.entries()) {
        const quiz = { ...incoming, lessonId, id: incoming.id || `fixture-saved-${state.writes.length}-${index}`,
          timestamp: incoming.timestamp === undefined ? payload.timestamp : incoming.timestamp };
        const oldIndex = state.quizzes.findIndex((item) => item.id === quiz.id);
        if (oldIndex < 0) state.quizzes.push(quiz);
        else state.quizzes[oldIndex] = quiz;
      }
      return fulfill(requestId, state.quizzes);
    }
    if (request.method !== 'GET') {
      state.unexpectedWrites.push({ method: request.method, path });
      return fulfill(requestId, null, 500);
    }
    const data = path.endsWith('/auth/me') ? user
      : path === `/api/v1/courses/${courseId}` ? course
      : path === `/api/v1/courses/public/${courseId}` ? { ...course, sections: [{ ...section, lessons: [lesson] }] }
      : path === `/api/v1/courses/${courseId}/sections` ? [section]
      : path === `/api/v1/sections/${sectionId}/lessons` ? [lesson]
      : path === `/api/v1/lessons/${lessonId}` ? lesson
      : path.endsWith('/quizzes/manage') ? state.quizzes
      : path.endsWith('/transcript') ? { lessonId, status: 'ready', durationSeconds: 120, sentences: [], rawTranscript: 'Bài giảng nấu ăn.' }
      : path.includes('/analysis/') || path.includes('/learning-progress/') ? null : [];
    return fulfill(requestId, data);
  });
  return { page, state, close: async () => { off(); await page.close(); } };
}

try {
  for (const width of [1440, 768, 390]) {
    const { page, state, close } = await fixture(width);
    try {
      await page.goto(`${origin}/courses/${courseId}/lessons/${lessonId}?mode=edit`, { timeoutMs: 60000, settleMs: 300 });
      await waitFor(page, () => document.querySelector('video')?.duration === 120 && !!document.querySelector('[data-checkpoint-time="20"]'), 'native video and management data');
      await enterFullscreen(page);
      const point = await page.eval(() => {
        const r = document.querySelector('input[aria-label="Thanh tua video"]').getBoundingClientRect();
        return { x: r.x + r.width * (45 / 120), y: r.y + r.height / 2 };
      });
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      await waitFor(page, () => !!document.querySelector('button[aria-label^="Thêm câu hỏi tại"]'), 'add-question timeline pin');
      await click(page, 'button[aria-label^="Thêm câu hỏi tại"]');
      const metrics = await editorVisible(page);
      assert.deepEqual(await times(page), ['00', '45', '', ''], 'Appearance uses the clicked timeline time, not current playback');
      await page.screenshot({ path: join(out, `new-fullscreen-${width}.png`), format: 'png' });

      await setTime(page, 'Thời điểm xuất hiện', '00', '46');
      await setTime(page, 'Thời gian giải thích', '00', '12');
      await fill(page, '[data-slot="dialog-content"] textarea[id$="-question"]', 'Câu hỏi được thêm từ video toàn màn hình');
      for (let index = 0; index < 4; index++) {
        await fill(page, `[data-slot="dialog-content"] input[id$="-option-${index}"]`, `Phương án ${index + 1}`);
      }
      await click(page, '[data-slot="dialog-content"] input[aria-label="Đáp án A đúng"]');
      await setTime(page, 'Thời gian giải thích', '02', '01');
      await clickText(page, 'Lưu / Cập nhật câu hỏi');
      assert.equal(state.writes.length, 0, 'Out-of-duration explanation cannot be saved');
      await setTime(page, 'Thời gian giải thích', '00', '12');
      await setTime(page, 'Thời điểm xuất hiện', '02', '01');
      await clickText(page, 'Lưu / Cập nhật câu hỏi');
      assert.equal(state.writes.length, 0, 'Out-of-duration appearance cannot be saved');
      await setTime(page, 'Thời điểm xuất hiện', '00', '46');
      await clickText(page, 'Lưu / Cập nhật câu hỏi');
      await waitFor(page, () => !document.querySelector('[data-slot="dialog-content"]'), 'save new question and close');
      assert.equal(state.writes[0].timestamp, 45, 'Original source checkpoint remains distinct from edited time');
      assert.equal(state.writes[0].questions[0].timestamp, 46);
      assert.equal(state.writes[0].questions[0].explanationTimestamp, 12);

      await click(page, '[data-checkpoint-time="46"]');
      await editorVisible(page);
      assert.deepEqual(await times(page), ['00', '46', '00', '12'], 'Saved timings reload correctly');
      await clickText(page, 'Xóa tất cả');
      await waitFor(page, () => document.querySelectorAll('[data-slot="dialog-content"]').length === 2, 'nested delete confirmation');
      await sleep(150);
      assert.equal(await page.eval(() => [...document.querySelectorAll('[data-slot="dialog-content"]')].every((dialog) => document.fullscreenElement.contains(dialog))), true);
      await page.screenshot({ path: join(out, `delete-fullscreen-${width}.png`), format: 'png' });
      await clickText(page, 'Hủy bỏ');
      await setTime(page, 'Thời điểm xuất hiện', '01', '20');
      await setTime(page, 'Thời gian giải thích', '00', '13');
      await page.eval(() => document.exitFullscreen());
      await waitFor(page, () => !document.fullscreenElement, 'exit fullscreen with draft still open');
      await editorVisible(page);
      assert.deepEqual(await times(page), ['01', '20', '00', '13'], 'Leaving fullscreen preserves unsaved fields');
      await page.screenshot({ path: join(out, `editor-windowed-${width}.png`), format: 'png' });
      await enterFullscreen(page);
      await editorVisible(page);
      await clickText(page, 'Lưu / Cập nhật câu hỏi');
      await waitFor(page, () => !document.querySelector('[data-slot="dialog-content"]'), 'save moved question');
      assert.equal(state.quizzes.find((quiz) => quiz.id === destination.id).explanationTimestamp, 72, 'Existing destination questions are untouched');
      assert.equal(state.quizzes.filter((quiz) => quiz.timestamp === 80).length, 2, 'Moving a question does not overwrite the destination');

      await click(page, '[data-checkpoint-time="20"]');
      await editorVisible(page);
      assert.deepEqual(await times(page), ['00', '20', '00', '12']);
      await setTime(page, 'Thời điểm xuất hiện', '00', '00');
      await click(page, '[data-quiz-question-index="1"]');
      assert.deepEqual(await times(page), ['00', '21', '00', '15'], 'Other questions keep their own timings');
      await click(page, '[data-quiz-question-index="0"]');
      assert.deepEqual(await times(page), ['00', '00', '00', '12'], 'Switching questions preserves unsaved zero-second timing');
      await clickText(page, 'Thêm câu');
      assert.deepEqual(await times(page), ['00', '20', '', ''], 'Appended questions start at the clicked checkpoint');
      await click(page, '[data-quiz-question-index="2"] button[title="Xóa câu hỏi này"]');
      await click(page, '[data-quiz-question-index="0"]');
      await clickText(page, 'Lưu / Cập nhật câu hỏi');
      await waitFor(page, () => !document.querySelector('[data-slot="dialog-content"]'), 'save edited existing checkpoint');
      assert.equal(state.quizzes.find((quiz) => quiz.id === question.id).timestamp, 0);
      assert.equal(state.quizzes.find((quiz) => quiz.id === question.id).explanationTimestamp, 12);
      assert.equal(state.quizzes.find((quiz) => quiz.id === second.id).timestamp, 21);
      assert.equal(state.quizzes.find((quiz) => quiz.id === second.id).explanationTimestamp, 15);

      // A short real pointer click on the existing-checkpoint badge appends a draft, not a drag.
      const checkpointPoint = await page.eval(() => {
        const r = document.querySelector('[data-checkpoint-time="21"]').getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...checkpointPoint });
      await waitFor(page, () => !!document.querySelector('button[title^="Nhấn để thêm câu hỏi"]'), 'existing-checkpoint add badge');
      await click(page, 'button[title^="Nhấn để thêm câu hỏi"]');
      await editorVisible(page);
      assert.deepEqual(await times(page), ['00', '21', '', ''], 'Clicking the checkpoint badge prefills the appended question');
      assert.equal(await page.eval(() => document.querySelectorAll('[data-quiz-question-index]').length), 2);
      await clickText(page, 'Hủy / Đóng');
      await page.eval(() => document.exitFullscreen());

      await clickText(page, 'Trắc nghiệm (Quiz)');
      await clickText(page, 'Sửa');
      await waitFor(page, () => !!document.querySelector('input[aria-label="Thời điểm xuất hiện - Giây"]'), 'original Quiz edit form');
      await sleep(150);
      assert.deepEqual(await times(page), ['00', '00', '00', '12'], 'Quiz tab reuses the same timing inputs');
      await page.screenshot({ path: join(out, `quiz-tab-edit-${width}.png`), format: 'png' });
      await clickText(page, 'Hủy');
      assert.deepEqual(state.unexpectedWrites, [], 'No requests reach real mutations or learner progress');
      assert.deepEqual(page.consoleErrors, [], 'No browser runtime exceptions');
      results.push({ width, fullscreenEditor: true, timingsPersist: true, preservesIdsAndOtherQuestions: true,
        nestedConfirmation: true, fullscreenTransitions: true, quizTabEditor: true, metrics });
    } catch (error) {
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' });
      writeFileSync(join(out, `failure-${width}.json`), JSON.stringify({
        error: String(error), state, errors: page.consoleErrors,
        page: await page.eval(() => ({ url: location.href, fullscreen: !!document.fullscreenElement, text: document.body.innerText.slice(-6000) })),
      }, null, 2));
      throw error;
    } finally {
      await close();
    }
  }
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
