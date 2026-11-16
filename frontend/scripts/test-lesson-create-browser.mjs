import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Exercise the real frontend with API-only fixtures. No real uploads or database writes.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
mkdirSync(process.env.TASTE_SKILL_TMP, { recursive: true });
const out = process.env.LESSON_CREATE_ARTIFACT_DIR ?? join(process.env.TASTE_SKILL_TMP, 'lesson-create-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.LESSON_CREATE_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const courseId = '6abf0202885b2bce17b4482e';
const sectionId = '507f1f77bcf86cd799439012';
const user = {
  id: '507f1f77bcf86cd799439014', role: 'instructor',
  fullName: 'Kiểm thử tạo bài học', email: 'lesson-create@example.test',
  isEmailVerified: true, status: 'active',
};
const dates = { createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z' };
const course = {
  id: courseId, title: 'Khóa học kiểm thử tạo bài', slug: 'lesson-create-check',
  description: '<p>Kiểm tra bắt buộc video hoặc tài liệu.</p>',
  price: 0, instructorId: user.id, level: 'beginner', status: 'draft',
  studentsCount: 0, ...dates,
};
const section = { id: sectionId, courseId, title: 'Bài giảng và tài liệu', order: 0, ...dates };
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, argument) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await page.eval(predicate, argument)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function openForm(page) {
  await page.eval(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Thêm bài').click());
  await waitFor(page, () => !!document.querySelector('#lesson-file-input'), 'create form');
  await page.eval(() => {
    const input = document.querySelector('#lesson-title');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Bài học kiểm thử');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(150);
}

async function selectFile(page, kind, method = 'input') {
  await page.eval(({ kind, method }) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(
      [kind === 'video' ? 'video-fixture' : '%PDF-fixture'],
      kind === 'video' ? 'bai-giang.mp4' : 'tai-lieu.pdf',
      { type: kind === 'video' ? 'video/mp4' : 'application/pdf' },
    ));
    if (method === 'drop') {
      document.querySelector('label[for="lesson-file-input"][class*="border-dashed"]').dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    } else {
      const input = document.querySelector('#lesson-file-input');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { kind, method });
}

async function submit(page, force = false) {
  await page.eval((force) => {
    const form = document.querySelector('[data-slot="dialog-content"] form');
    if (force) form.requestSubmit();
    else form.querySelector('button[type="submit"]').click();
  }, force);
  await sleep(200);
}

async function assertDisabled(page, expected) {
  assert.equal(await page.eval(() => document.querySelector('[data-slot="dialog-content"] button[type="submit"]').disabled), expected);
}

async function inspectDialog(page) {
  const metrics = await page.eval(() => {
    const dialog = document.querySelector('[data-slot="dialog-content"]');
    const bounds = dialog.getBoundingClientRect();
    return {
      viewport: innerWidth, left: bounds.left, right: bounds.right,
      clientWidth: dialog.clientWidth, scrollWidth: dialog.scrollWidth,
      text: dialog.textContent,
      required: document.querySelector('#lesson-file-input').getAttribute('aria-required'),
    };
  });
  assert.ok(metrics.left >= 0 && metrics.right <= metrics.viewport + 1, 'Dialog must fit viewport');
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, 'Dialog must not overflow horizontally');
  assert.equal(metrics.required, 'true');
  assert.ok(!metrics.text.includes('Nội dung cốt lõi'), 'Retired core input must be absent');
  assert.ok(!metrics.text.includes('Không bắt buộc'), 'Upload must no longer be marked optional');
  return metrics;
}

try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ width, height: 1000, mobile: width < 600, reducedMotion: true });
    const uploads = [];
    const creates = [];
    const unexpectedWrites = [];
    let pendingUpload = null;
    let uploadKind = 'video';
    let failCreate = true;

    async function fulfill(requestId, data, status = 200) {
      await page.send('Fetch.fulfillRequest', {
        requestId, responseCode: status,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
        body: status === 204 ? '' : Buffer.from(JSON.stringify({
          success: status < 400, data, message: status < 400 ? 'OK' : 'Lỗi kiểm thử, vui lòng thử lại',
        })).toString('base64'),
      });
    }

    async function releaseUpload(success) {
      await waitFor(page, () => document.querySelector('button[type="submit"]')?.textContent.includes('Đang tải file'), 'upload in progress');
      for (let attempt = 0; !pendingUpload && attempt < 100; attempt++) await sleep(25);
      assert.ok(pendingUpload, 'Upload request must be intercepted');
      const id = pendingUpload;
      pendingUpload = null;
      await fulfill(id, success ? {
        type: uploadKind,
        url: `http://localhost:9000/media/${uploadKind === 'video' ? 'bai-giang.mp4' : 'tai-lieu.pdf'}`,
        fileName: uploadKind === 'video' ? 'bai-giang.mp4' : 'tai-lieu.pdf',
        mimeType: uploadKind === 'video' ? 'video/mp4' : 'application/pdf',
        fileSize: 1024,
      } : null, success ? 200 : 500);
      await waitFor(page, (success) => {
        const dialog = document.querySelector('[data-slot="dialog-content"]');
        return success ? dialog?.textContent.includes('Đã lưu MinIO') : dialog?.textContent.includes('Tải lên thất bại');
      }, 'upload response', success);
    }

    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('accessToken','lesson-create-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
    });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      const path = new URL(request.url).pathname;
      if (request.method === 'OPTIONS') return fulfill(requestId, null, 204);
      if (request.method === 'POST' && path === '/api/v1/lesson-content/upload') {
        uploads.push(path);
        pendingUpload = requestId;
        return;
      }
      if (request.method === 'POST' && path === `/api/v1/sections/${sectionId}/lessons`) {
        const payload = JSON.parse(request.postData);
        creates.push(payload);
        return fulfill(requestId, { id: 'new-lesson', sectionId, ...payload, ...dates }, failCreate ? 500 : 201);
      }
      if (request.method !== 'GET') {
        unexpectedWrites.push({ path, method: request.method });
        return fulfill(requestId, null, 405);
      }
      const data = path.endsWith('/auth/me') ? user
        : path === `/api/v1/courses/${courseId}` ? course
        : path === `/api/v1/courses/${courseId}/sections` ? [section]
        : [];
      return fulfill(requestId, data);
    });

    try {
      await page.goto(`${origin}/courses/${courseId}?mode=edit`, { timeoutMs: 60000, settleMs: 500 });
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Thêm bài'), 'add lesson action');
      await openForm(page);
      const empty = await inspectDialog(page);
      await assertDisabled(page, true);
      await submit(page, true);
      assert.equal(creates.length, 0, 'Forced submit/Enter must not create without a file');
      await page.screenshot({ path: join(out, `required-empty-${width}.png`), format: 'png' });

      await selectFile(page, 'video');
      await waitFor(page, () => document.querySelector('button[type="submit"]')?.textContent.includes('Đang tải file'), 'pending upload');
      await assertDisabled(page, true);
      await submit(page, true);
      assert.equal(creates.length, 0, 'Must not create during upload');
      await releaseUpload(false);
      await assertDisabled(page, true);
      await submit(page, true);
      assert.equal(creates.length, 0, 'Must not create after a failed upload');

      await page.eval(() => [...document.querySelectorAll('[data-slot="dialog-content"] button')].find((button) => button.textContent.trim() === 'Thử lại').click());
      await releaseUpload(true);
      await assertDisabled(page, false);
      await submit(page);
      assert.equal(creates.length, 1);
      assert.ok(await page.eval(() => !!document.querySelector('#lesson-title')), 'Failed create must retain dialog');
      await assertDisabled(page, false);
      assert.equal(uploads.length, 2, 'Create retry must not upload again');
      failCreate = false;
      await submit(page);
      await waitFor(page, () => !document.querySelector('#lesson-title'), 'video created');
      assert.equal(creates.length, 2);
      assert.equal(uploads.length, 2);

      await openForm(page);
      await assertDisabled(page, true);
      await selectFile(page, 'video', 'drop');
      await releaseUpload(true);
      await assertDisabled(page, false);
      await page.eval(() => document.querySelector('button[title="Xóa file khỏi bài học"]').click());
      await waitFor(page, () => !!document.querySelector('label[for="lesson-file-input"][class*="border-dashed"]'), 'file removed');
      await assertDisabled(page, true);
      await submit(page, true);
      assert.equal(creates.length, 2, 'Removed file metadata must not be reused');

      await page.eval(() => document.querySelector('#lesson-content-type').click());
      await waitFor(page, () => !!document.querySelector('[role="option"][data-value="document"]') || [...document.querySelectorAll('[role="option"]')].some((option) => option.textContent.includes('Tài liệu')), 'document option');
      await page.eval(() => [...document.querySelectorAll('[role="option"]')].find((option) => option.textContent.includes('Tài liệu')).click());
      uploadKind = 'document';
      await selectFile(page, 'document');
      await releaseUpload(true);
      await assertDisabled(page, false);
      await inspectDialog(page);
      await page.screenshot({ path: join(out, `required-document-${width}.png`), format: 'png' });
      await submit(page);
      await waitFor(page, () => !document.querySelector('#lesson-title'), 'document created');
      assert.equal(creates.length, 3);
      for (const payload of creates) {
        assert.ok(payload.content?.url);
        assert.ok(['video', 'document'].includes(payload.content.type));
        assert.ok(!Object.hasOwn(payload, 'description'));
        assert.ok(!Object.hasOwn(payload, 'keyPoints'));
      }
      assert.equal(creates[0].content.type, 'video');
      assert.equal(creates[2].content.type, 'document');
      assert.deepEqual(unexpectedWrites, []);
      assert.deepEqual(page.consoleErrors, []);
      results.push({ width, status: 'PASS', empty, uploads: uploads.length, creates });
      console.log(`PASS ${width}px: required file, forced submit, pending/error/retry, video, removal, reset, document; no real server writes`);
    } catch (error) {
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' });
      results.push({ width, status: 'FAIL', error: error.message, consoleErrors: page.consoleErrors, creates, uploads });
      throw error;
    } finally {
      off();
      await page.close();
    }
  }
} finally {
  writeFileSync(join(out, 'results.json'), JSON.stringify({ origin, results }, null, 2));
  await browser.close();
}
