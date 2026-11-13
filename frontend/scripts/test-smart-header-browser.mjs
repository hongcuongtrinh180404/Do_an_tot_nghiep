import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Run against an existing frontend server. API fixtures are intercepted in the
// browser, so this test never logs in or changes real server/database data.
process.env.TASTE_SKILL_TMP ??= join(tmpdir(), 'opencode');
mkdirSync(process.env.TASTE_SKILL_TMP, { recursive: true });
const out = process.env.SMART_HEADER_ARTIFACT_DIR ?? join(process.env.TASTE_SKILL_TMP, 'smart-header-check');
mkdirSync(out, { recursive: true });
const origin = (process.env.SMART_HEADER_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
const results = [];
const user = {
  id: '507f1f77bcf86cd799439014',
  role: 'student',
  email: 'header-check@example.test',
  fullName: 'Header Test User',
  isEmailVerified: true,
  status: 'active',
};
const browser = await Browser.launch();
const browserVersion = await browser.send('Browser.getVersion');

async function waitFor(page, predicate, message) {
  for (let i = 0; i < 100; i++) {
    if (await page.eval(predicate)) return;
    await sleep(100);
  }
  throw new Error(message);
}

async function newPage(width, height, path = '/', reducedMotion = true) {
  const page = await browser.newPage({ width, height, mobile: width < 600, reducedMotion });
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('accessToken','header-test-fixture');localStorage.setItem('user',${JSON.stringify(JSON.stringify(user))});`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
  browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url);
      const data = url.pathname.endsWith('/auth/me') ? user
        : url.pathname.endsWith('/courses') ? { items: [], total: 0, page: 1, limit: 9, totalPages: 0 }
        : [];
      await page.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: request.method === 'OPTIONS' ? 204 : 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
          { name: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
        body: request.method === 'OPTIONS' ? '' : Buffer.from(JSON.stringify({ success: true, data })).toString('base64'),
      });
    } catch (error) {
      console.error('Fixture error:', error.message);
    }
  });
  await page.goto(`${origin}${path}`, { settleMs: 500 });
  await waitFor(page, () => !!document.querySelector('button[aria-label="Menu tài khoản cá nhân"]'), 'Header did not hydrate');
  await page.eval(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    window.headerSnapshot = () => {
      const header = document.querySelector('header[data-ui="header"]');
      const rect = header.getBoundingClientRect();
      return {
        scrollY: window.scrollY,
        ariaHidden: header.getAttribute('aria-hidden'),
        top: Math.round(rect.top * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        translate: getComputedStyle(header).translate,
        pointerEvents: getComputedStyle(header).pointerEvents,
        position: getComputedStyle(header).position,
        parentOverflowX: getComputedStyle(header.parentElement).overflowX,
        parentOverflowY: getComputedStyle(header.parentElement).overflowY,
        focusInside: header.contains(document.activeElement),
        drawerOpen: !!document.querySelector('[data-ui="mobile-menu"]'),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    };
  });
  return page;
}

async function scrollTo(page, y) {
  await page.eval(async (nextY) => {
    window.scrollTo({ top: nextY, behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, y);
  await sleep(30);
  return page.eval(() => window.headerSnapshot());
}

function visible(snapshot) {
  assert.equal(snapshot.ariaHidden, 'false', 'Header state should be visible');
  assert.ok(Math.abs(snapshot.top) <= 1 && snapshot.bottom > 0, `Header must be pinned to viewport top; rect.top=${snapshot.top}`);
  assert.equal(snapshot.pointerEvents, 'auto');
  assert.equal(snapshot.horizontalOverflow, false, 'Changing overflow must not introduce horizontal scrolling');
}

function hidden(snapshot) {
  assert.equal(snapshot.ariaHidden, 'true', 'Header state should be hidden');
  assert.ok(snapshot.bottom <= 1, `Header must be outside the viewport; bottom=${snapshot.bottom}`);
  assert.equal(snapshot.pointerEvents, 'none');
}

async function check(page, name, action) {
  try {
    const snapshot = await action();
    results.push({ name, status: 'PASS', snapshot });
    console.log('PASS', name);
    if (name.includes('shown and pinned') || name.includes('open drawer locks')) {
      const filename = name.replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '');
      await page.screenshot({ path: join(out, `${filename}.png`), format: 'png' });
    }
  } catch (error) {
    const snapshot = await page.eval(() => window.headerSnapshot());
    results.push({ name, status: 'FAIL', error: error.message, snapshot });
    console.log('FAIL', name, error.message);
    await page.screenshot({ path: join(out, `failure-${results.length}.png`), format: 'png' });
  }
}

try {
  const desktop = await newPage(1440, 900);
  await check(desktop, 'desktop: visible at scrollY=0', async () => {
    const snapshot = await scrollTo(desktop, 0);
    visible(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: visible and pinned at scrollY=64', async () => {
    const snapshot = await scrollTo(desktop, 64);
    visible(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: hidden after downward scroll', async () => {
    const snapshot = await scrollTo(desktop, 500);
    hidden(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: remains hidden below 8px upward', async () => {
    const snapshot = await scrollTo(desktop, 493);
    hidden(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: shown and pinned after exactly 8px upward', async () => {
    const snapshot = await scrollTo(desktop, 492);
    visible(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: accumulates eight separate 1px upward frames', async () => {
    await scrollTo(desktop, 700);
    for (let y = 699; y > 692; y--) hidden(await scrollTo(desktop, y));
    const snapshot = await scrollTo(desktop, 692);
    visible(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: search focus locks visibility while scrolling', async () => {
    await scrollTo(desktop, 0);
    await desktop.eval(() => document.querySelector('header input').focus({ preventScroll: true }));
    const snapshot = await scrollTo(desktop, 500);
    assert.equal(snapshot.focusInside, true);
    visible(snapshot);
    return snapshot;
  });
  await check(desktop, 'desktop: blur does not hide on the first 1px scroll', async () => {
    await desktop.eval(() => document.activeElement.blur());
    await sleep(50);
    const snapshot = await scrollTo(desktop, 501);
    assert.equal(snapshot.ariaHidden, 'false', 'Only 1px has been scrolled after interaction ended');
    return snapshot;
  });
  await check(desktop, 'desktop: account menu locks visibility while scrolling', async () => {
    await scrollTo(desktop, 0);
    await desktop.eval(() => document.querySelector('button[aria-label="Menu tài khoản cá nhân"]').click());
    await waitFor(desktop, () => document.querySelector('button[aria-label="Menu tài khoản cá nhân"]')?.getAttribute('aria-expanded') === 'true', 'Account menu did not open');
    const snapshot = await scrollTo(desktop, 500);
    visible(snapshot);
    return snapshot;
  });
  await desktop.close();

  const mobile = await newPage(390, 844);
  await check(mobile, 'mobile: visible at scrollY=0', async () => {
    const snapshot = await scrollTo(mobile, 0);
    visible(snapshot);
    return snapshot;
  });
  await check(mobile, 'mobile: visible and pinned at scrollY=64', async () => {
    const snapshot = await scrollTo(mobile, 64);
    visible(snapshot);
    return snapshot;
  });
  await check(mobile, 'mobile: hidden after downward scroll', async () => {
    const snapshot = await scrollTo(mobile, 500);
    hidden(snapshot);
    return snapshot;
  });
  await check(mobile, 'mobile: shown and pinned after exactly 8px upward', async () => {
    const snapshot = await scrollTo(mobile, 492);
    visible(snapshot);
    return snapshot;
  });
  await check(mobile, 'mobile: open drawer locks visibility while scrolling', async () => {
    await scrollTo(mobile, 0);
    await mobile.eval(() => document.querySelector('button[aria-label="Mở danh mục điều hướng"]').click());
    await waitFor(mobile, () => !!document.querySelector('[data-ui="mobile-menu"]'), 'Mobile drawer did not open');
    const snapshot = await scrollTo(mobile, 500);
    assert.equal(snapshot.drawerOpen, true);
    visible(snapshot);
    return snapshot;
  });
  await check(mobile, 'mobile: drawer input focus keeps header visible', async () => {
    await scrollTo(mobile, 0);
    await mobile.eval(() => document.querySelector('[data-ui="mobile-menu"] input').focus({ preventScroll: true }));
    const snapshot = await scrollTo(mobile, 700);
    assert.equal(snapshot.focusInside, true);
    visible(snapshot);
    return snapshot;
  });
  await mobile.close();

  const tablet = await newPage(768, 1024);
  await check(tablet, 'tablet: visible and pinned at scrollY=64', async () => {
    const snapshot = await scrollTo(tablet, 64);
    visible(snapshot);
    return snapshot;
  });
  await check(tablet, 'tablet: shown and pinned after exactly 8px upward', async () => {
    hidden(await scrollTo(tablet, 500));
    const snapshot = await scrollTo(tablet, 492);
    visible(snapshot);
    return snapshot;
  });
  await tablet.close();

  for (const width of [1440, 390]) {
    const label = width === 1440 ? 'desktop' : 'mobile';
    const catalog = await newPage(width, width === 1440 ? 900 : 844, '/courses?view=catalog');
    let catalogDownY;
    await check(catalog, `catalog ${label}: visible and pinned at scrollY=64`, async () => {
      const snapshot = await scrollTo(catalog, 64);
      visible(snapshot);
      return snapshot;
    });
    await check(catalog, `catalog ${label}: hidden after downward scroll`, async () => {
      const snapshot = await scrollTo(catalog, 500);
      // An empty catalog can end before 500px. Measure its real scroll position
      // so the upward test moves exactly 8px instead of requesting another
      // position beyond the bottom (which would not move the page at all).
      assert.ok(snapshot.scrollY > 72, 'Catalog fixture must scroll beyond the top offset and threshold');
      catalogDownY = snapshot.scrollY;
      hidden(snapshot);
      return snapshot;
    });
    await check(catalog, `catalog ${label}: shown and pinned after exactly 8px upward`, async () => {
      const snapshot = await scrollTo(catalog, catalogDownY - 8);
      assert.equal(snapshot.scrollY, catalogDownY - 8, 'Catalog must move exactly 8px upward');
      visible(snapshot);
      return snapshot;
    });
    await catalog.close();
  }

  // Also exercise real wheel input with the normal 300ms CSS transition enabled.
  const animated = await newPage(1440, 900, '/', false);
  let wheelStartY;
  await check(animated, 'normal motion: hidden after real downward wheel input', async () => {
    await animated.wheel(500, { step: 500, pauseMs: 50 });
    await sleep(350);
    const snapshot = await animated.eval(() => window.headerSnapshot());
    hidden(snapshot);
    wheelStartY = snapshot.scrollY;
    return snapshot;
  });
  await check(animated, 'normal motion: shown and pinned after real upward 8px wheel input', async () => {
    await animated.wheel(-8, { step: 8, pauseMs: 50 });
    await sleep(350);
    const snapshot = await animated.eval(() => window.headerSnapshot());
    assert.equal(snapshot.scrollY, wheelStartY - 8, 'Wheel must move exactly 8px upward');
    visible(snapshot);
    return snapshot;
  });
  await animated.close();
} finally {
  const counts = {
    passed: results.filter((result) => result.status === 'PASS').length,
    failed: results.filter((result) => result.status === 'FAIL').length,
    total: results.length,
  };
  writeFileSync(join(out, 'results.json'), JSON.stringify({
    origin,
    browser: browserVersion.product,
    timestamp: new Date().toISOString(),
    fixtures: 'Network-only API fixtures; no server/database mutations',
    counts,
    results,
  }, null, 2));
  console.log(`${counts.passed}/${counts.total} browser checks passed. Results: ${join(out, 'results.json')}`);
  await browser.close();
}

if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1;
