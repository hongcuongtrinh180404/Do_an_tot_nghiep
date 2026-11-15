import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Test the actual frontend bundle with network-only fixtures. Never upload a file
// or change server data, and never inject layout classes/styles into the dialog.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
mkdirSync(process.env.TASTE_SKILL_TMP, { recursive: true });
const out = process.env.LESSON_DOC_ARTIFACT_DIR ?? join(process.env.TASTE_SKILL_TMP, 'lesson-doc-dialog-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.LESSON_DOC_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const courseId = process.env.LESSON_DOC_COURSE_ID ?? '6aedae382b46b37a17232f35';
const sectionId = '507f1f77bcf86cd799439012';
const lessonId = '507f1f77bcf86cd799439013';
const user = {
  id: '507f1f77bcf86cd799439014', role: 'instructor',
  fullName: 'Kiểm thử đính kèm', email: 'attachment-check@example.test',
  isEmailVerified: true, status: 'active',
};
const dates = { createdAt: '2026-11-15T00:00:00Z', updatedAt: '2026-11-15T00:00:00Z' };
const course = {
  id: courseId, title: 'Khóa học kiểm thử đính kèm', slug: 'attachment-check',
  description: '<p>Kiểm tra bố cục tệp đính kèm của video bài học.</p>',
  shortDescription: 'Kiểm tra tên tệp dài.', price: 0, instructorId: user.id,
  level: 'beginner', status: 'draft', studentsCount: 0, ...dates,
};
const section = { id: sectionId, courseId, title: 'Tệp bài giảng', order: 0, ...dates };
const lesson = {
  id: lessonId, sectionId, title: 'Video bài giảng', order: 0, isPreview: true,
  content: { type: 'video', url: '', duration: 120 }, materials: [], ...dates,
};
const files = [
  ['reported-file', 'Raymond Murphy - English Grammar in use (with answers)_ 2nd edition.pdf', 'input'],
  ['long-unbroken', `Tai_lieu_${'lap_trinh_va_thuat_toan_'.repeat(8)}day_du.pdf`, 'input'],
  ['long-spaced', 'Tài liệu bài giảng nâng cao về lập trình và thuật toán dành cho học viên - ôn tập và bài tập thực hành - phiên bản đầy đủ tháng 11 năm 2026.pdf', 'drop'],
  ['long-unicode', `Tài_liệu_${'Lập_trình_và_thuật_toán_'.repeat(8)}đầy_đủ.docx`, 'input'],
  ['short', 'slide.pdf', 'input'],
];
const results = [];
const writes = [];
const browser = await Browser.launch();
const version = await browser.send('Browser.getVersion');

async function waitFor(page, predicate, label, argument) {
  for (let i = 0; i < 150; i++) {
    if (await page.eval(predicate, argument)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

function measure() {
  const dialog = document.querySelector('[data-slot="dialog-content"]');
  const form = dialog.querySelector('form');
  const text = dialog.querySelector('p[title]');
  const row = text?.parentElement.parentElement.parentElement;
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
  };
  return {
    viewport: innerWidth,
    dialog: rect(dialog),
    clientWidth: dialog.clientWidth,
    scrollWidth: dialog.scrollWidth,
    padding: parseFloat(getComputedStyle(dialog).paddingRight),
    form: rect(form),
    input: rect(dialog.querySelector('#doc-title')),
    title: dialog.querySelector('#doc-title').value,
    row: rect(row),
    footer: rect(dialog.querySelector('[data-slot="dialog-footer"]')),
    buttons: [...dialog.querySelectorAll('button')].map((button) => {
      const r = button.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { label: button.getAttribute('aria-label') || button.textContent.trim(), ...rect(button), clickable: hit === button || button.contains(hit) };
    }),
    text: text ? {
      title: text.title, content: text.textContent.trim(),
      width: text.clientWidth, scrollWidth: text.scrollWidth,
      textOverflow: getComputedStyle(text).textOverflow,
      whiteSpace: getComputedStyle(text).whiteSpace,
    } : null,
  };
}

function checkBounds(s) {
  assert.ok(s.dialog.left >= -1 && s.dialog.right <= s.viewport + 1, 'Modal must fit the viewport');
  assert.ok(s.scrollWidth <= s.clientWidth + 1, 'Modal must not overflow horizontally');
  assert.ok(s.form.left >= s.dialog.left + s.padding - 1 && s.form.right <= s.dialog.right - s.padding + 1, 'Form must fit inside modal padding');
  assert.ok(s.input.right <= s.form.right + 1, 'Title input must fit the form');
  assert.ok(s.footer.left >= s.dialog.left - 1 && s.footer.right <= s.dialog.right + 1, 'Footer must fit the modal');
  if (s.row) assert.ok(s.row.left >= s.form.left - 1 && s.row.right <= s.form.right + 1, 'File row must fit the form');
  for (const button of s.buttons) {
    assert.ok(button.left >= s.dialog.left - 1 && button.right <= s.dialog.right + 1, `${button.label}: button must fit the modal`);
    assert.ok(button.top >= s.dialog.top - 1 && button.bottom <= s.dialog.bottom + 1, `${button.label}: button must fit vertically`);
    assert.equal(button.clickable, true, `${button.label}: button must remain visible and clickable`);
  }
}

async function openDialog(page, inspector = false) {
  await page.eval((fromInspector) => {
    const button = fromInspector
      ? [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === 'Đính kèm tệp')
      : document.querySelector('button[aria-label="Đính kèm tài liệu cho video này"]');
    button.scrollIntoView({ block: 'center' });
    button.click();
  }, inspector);
  await waitFor(page, () => !!document.querySelector('#doc-file-input'), 'attachment dialog');
  await sleep(250);
}

async function selectFile(page, fileName, method) {
  await page.eval(({ fileName, method }) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['%PDF-1.7\nattachment layout test'], fileName, { type: 'application/pdf' }));
    if (method === 'drop') {
      document.querySelector('label[for="doc-file-input"]').dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    } else {
      const input = document.querySelector('#doc-file-input');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { fileName, method });
  await waitFor(page, (expected) => document.querySelector('[data-slot="dialog-content"] p[title]')?.title === expected, 'selected filename', fileName);
}

async function closeDialog(page) {
  await page.eval(() => [...document.querySelectorAll('[data-slot="dialog-content"] button')].find((button) => button.textContent.trim() === 'Hủy').click());
  await waitFor(page, () => !document.querySelector('#doc-file-input'), 'dialog closed');
}

try {
  for (const width of [1440, 768, 486, 390]) {
    const page = await browser.newPage({ width, height: width === 768 ? 1024 : 900, mobile: width < 600, reducedMotion: true });
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('accessToken','attachment-check-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
    });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
    browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
      const path = new URL(request.url).pathname;
      const isWrite = request.method !== 'GET' && request.method !== 'OPTIONS';
      if (isWrite) writes.push({ method: request.method, path });
      const data = path.endsWith('/auth/me') ? user
        : path === `/api/v1/courses/${courseId}` ? course
        : path === `/api/v1/courses/${courseId}/sections` ? [section]
        : path === `/api/v1/sections/${sectionId}/lessons` ? [lesson]
        : path === `/api/v1/lessons/${lessonId}` ? lesson : [];
      await page.send('Fetch.fulfillRequest', {
        requestId, responseCode: isWrite ? 405 : request.method === 'OPTIONS' ? 204 : 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
        body: request.method === 'OPTIONS' ? '' : Buffer.from(JSON.stringify({ success: !isWrite, data })).toString('base64'),
      });
    });
    try {
      await page.goto(`${origin}/courses/${courseId}?mode=edit`, { timeoutMs: 60000, settleMs: 500 });
      await waitFor(page, () => !!document.querySelector('button[title="Mở rộng chương"]'), 'chapter toggle');
      await page.eval(() => document.querySelector('button[title="Mở rộng chương"]').click());
      await waitFor(page, () => !!document.querySelector('button[aria-label="Đính kèm tài liệu cho video này"]'), 'attachment icon');
      for (const [name, fileName, method] of files) {
        await openDialog(page);
        checkBounds(await page.eval(measure));
        await selectFile(page, fileName, method);
        const snapshot = await page.eval(measure);
        checkBounds(snapshot);
        assert.equal(snapshot.title, fileName.replace(/\.[^/.]+$/, ''), 'Selected filename must still auto-fill the title');
        assert.equal(snapshot.text.title, fileName, 'Tooltip must retain the original filename');
        assert.equal(snapshot.text.content, fileName, 'Original filename must not be altered');
        assert.equal(snapshot.text.textOverflow, 'ellipsis');
        assert.equal(snapshot.text.whiteSpace, 'nowrap');
        if (name !== 'short') assert.ok(snapshot.text.scrollWidth > snapshot.text.width, 'Long filename must be truncated');
        else assert.ok(snapshot.text.scrollWidth <= snapshot.text.width + 1, 'Short filename must be fully visible');
        if (name === 'reported-file') await page.screenshot({ path: join(out, `reported-file-${width}.png`), format: 'png' });
        results.push({ width, name, method, status: 'PASS', snapshot });
        console.log(`PASS ${width}px ${name}: modal ${snapshot.dialog.width}px, form ${snapshot.form.width}px; no overflow`);
        await page.eval(() => document.querySelector('button[aria-label="Gỡ bỏ tệp"]').click());
        await waitFor(page, () => !!document.querySelector('label[for="doc-file-input"]'), 'remove and reselect');
        checkBounds(await page.eval(measure));
        results.push({ width, name: `remove-${name}`, status: 'PASS' });
        await closeDialog(page);
      }
      await page.eval((id) => document.querySelector(`[data-approval-lesson="${id}"]`).click(), lessonId);
      await waitFor(page, () => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Đính kèm tệp'), 'inspector attachment button');
      await openDialog(page, true);
      await selectFile(page, files[0][1], 'input');
      const inspector = await page.eval(measure);
      checkBounds(inspector);
      results.push({ width, name: 'inspector-entry-point', status: 'PASS', snapshot: inspector });
      await closeDialog(page);
    } catch (error) {
      results.push({ width, status: 'FAIL', error: error.message });
      await page.screenshot({ path: join(out, `failure-${width}.png`), format: 'png' });
      throw error;
    } finally {
      await page.close();
    }
  }
  assert.equal(writes.length, 0, 'Layout checks must not issue any server mutations');
  console.log(`PASS: ${results.length} checks. Actual frontend CSS; API fixtures only; no server/database changes.`);
} finally {
  writeFileSync(join(out, 'results.json'), JSON.stringify({ origin, courseId, browser: version.product, results, writes }, null, 2));
  await browser.close();
}
