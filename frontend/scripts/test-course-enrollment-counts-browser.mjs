import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Reads the running app/API only. No account, enrollment, payment or database writes.
const origin = process.env.COURSE_COUNTS_ORIGIN || 'http://localhost:3000';
const api = (process.env.COURSE_COUNTS_API || 'http://localhost:8000/api/v1').replace(/\/$/, '');
process.env.TASTE_SKILL_TMP ??= join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
const out = join(process.env.TASTE_SKILL_TMP, 'course-enrollment-counts-browser');
mkdirSync(out, { recursive: true });

async function get(path) {
  const response = await fetch(`${api}${path}`);
  assert.equal(response.ok, true, `GET ${path}: ${response.status}`);
  return (await response.json()).data;
}

const first = await get('/courses?page=1&limit=100');
const courses = [...first.items];
for (let page = 2; page <= first.totalPages; page++) {
  courses.push(...(await get(`/courses?page=${page}&limit=100`)).items);
}
assert.ok(courses.length > 0, 'At least one database course is required');
const target = courses.find((course) => course.id === '77b9cd9815111ed2df8429c2') || courses[0];
const zero = courses.find((course) => course.studentsCount === 0);
const expected = Object.fromEntries(courses.map((course) => [course.id, course.studentsCount]));
const browser = await Browser.launch();
const results = [];

async function waitFor(page, predicate, label, arg) {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (await page.eval(predicate, arg)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function verifyHeader(page, course) {
  await page.goto(`${origin}/courses/${course.id}`, { timeoutMs: 60000, settleMs: 250 });
  await waitFor(page, (text) => [...document.querySelectorAll('main header span')]
    .some((node) => node.textContent === text), 'database-backed detail count',
  `${course.studentsCount.toLocaleString('vi-VN')} học viên`);
}

async function verifyCards(page, selector) {
  await waitFor(page, (selector) => document.querySelectorAll(selector).length > 0, selector, selector);
  const cards = await page.eval((selector) => [...document.querySelectorAll(selector)].map((node) => ({
    id: node.querySelector('a[href^="/courses/"]')?.getAttribute('href')?.split('/')[2],
    text: node.textContent,
  })), selector);
  for (const card of cards) {
    assert.ok(Object.hasOwn(expected, card.id), `No frontend-only course: ${card.id}`);
    assert.ok(card.text.includes(`${expected[card.id].toLocaleString('vi-VN')} học viên`),
      `Course ${card.id} must display ${expected[card.id]} students`);
  }
  return cards.length;
}

try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ width, height: width < 800 ? 1000 : 1100, mobile: width < 600 });
    try {
      await verifyHeader(page, target);
      await page.screenshot({ path: join(out, `detail-${width}.png`), format: 'png' });
      await page.eval(() => document.querySelector('#tab-instructor')?.click());
      await waitFor(page, () => !!document.querySelector('#tabpanel-instructor'), 'instructor tab');
      const instructorCourses = courses.filter((course) => course.instructorId === target.instructorId);
      const total = instructorCourses.reduce((sum, course) => sum + course.studentsCount, 0);
      await waitFor(page, (expected) => {
        const label = [...document.querySelectorAll('#tabpanel-instructor span')]
          .find((node) => node.textContent === 'Lượt ghi danh');
        return label?.parentElement?.querySelector('p')?.textContent === expected;
      }, 'complete instructor enrollment total', total.toLocaleString('vi-VN'));
      await page.eval(() => document.querySelector('#tabpanel-instructor')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: join(out, `instructor-${width}.png`), format: 'png' });
      assert.equal(await page.eval(() => document.querySelector('#tabpanel-instructor').textContent.includes('96%')), false);
      if (zero) await verifyHeader(page, zero);

      await page.goto(origin, { timeoutMs: 60000, settleMs: 250 });
      const featured = await verifyCards(page, '#featured article[data-ui="card"]');
      const recent = await verifyCards(page, '#recent article[data-ui="card"]');
      const highlightIds = await page.eval(() => [...document.querySelectorAll(
        'section[aria-label="Tin tức và khóa học nổi bật"] a[href^="/courses/"]',
      )].map((node) => node.getAttribute('href').split('/')[2]));
      assert.ok(highlightIds.length > 0, 'Highlights loaded from the database');
      for (const id of highlightIds) assert.ok(Object.hasOwn(expected, id), `Real highlight ID: ${id}`);
      await page.screenshot({ path: join(out, `homepage-${width}.png`), format: 'png' });

      await page.goto(`${origin}/courses?view=catalog`, { timeoutMs: 60000, settleMs: 250 });
      const catalog = await verifyCards(page, 'main article[data-ui="card"]');
      assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}`);
      await page.screenshot({ path: join(out, `catalog-${width}.png`), format: 'png' });
      results.push({ width, detailStudents: target.studentsCount, zeroVerified: Boolean(zero), instructorEnrollments: total,
        featured, recent, highlights: highlightIds.length, catalog });
    } finally {
      await page.close();
    }
  }

  const page = await browser.newPage({ width: 1440, height: 1100 });
  let fail = true;
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/courses*' }] });
  const off = browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    if (!fail || request.method !== 'GET' || new URL(request.url).pathname !== '/api/v1/courses') {
      return page.send('Fetch.continueRequest', { requestId });
    }
    await page.send('Fetch.fulfillRequest', {
      requestId, responseCode: 503,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }],
      body: Buffer.from(JSON.stringify({ message: 'Course read unavailable' })).toString('base64'),
    });
  });
  try {
    await page.goto(`${origin}/courses?view=catalog`, { timeoutMs: 60000, settleMs: 250 });
    await waitFor(page, () => !!document.querySelector('main [role="alert"]'), 'explicit API error');
    assert.equal(await page.eval(() => document.querySelectorAll('main article[data-ui="card"]').length), 0);
    assert.equal(await page.eval(() => document.querySelector('main').textContent.includes('Không tìm thấy khóa học phù hợp')), false);
    await page.screenshot({ path: join(out, 'api-error.png'), format: 'png' });
    fail = false;
    await page.eval(() => document.querySelector('main [role="alert"] button').click());
    await verifyCards(page, 'main article[data-ui="card"]');
    results.push({ apiFailure: 'explicit error, no mock cards', retry: 'real API data restored' });
  } finally {
    off();
    await page.close();
  }
  console.log(JSON.stringify({ databaseCourses: courses.length, results, screenshots: out }, null, 2));
} finally {
  await browser.close();
}
