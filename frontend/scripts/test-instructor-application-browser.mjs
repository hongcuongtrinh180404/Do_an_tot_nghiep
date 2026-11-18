import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Runs against a local frontend. All account API traffic is intercepted; no real
// account is created, submitted, or changed by these checks.
process.env.TASTE_SKILL_TMP ??= join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
const origin = process.env.INSTRUCTOR_ORIGIN || 'http://localhost:3000';
const previewAllowed = process.env.INSTRUCTOR_PREVIEW !== 'false';
const out = join(process.env.TASTE_SKILL_TMP, 'instructor-application-browser', previewAllowed ? 'dev' : 'production');
mkdirSync(out, { recursive: true });
const browser = await Browser.launch();
const results = [];
const student = {
  id: '507f1f77bcf86cd799439014', email: 'instructor-preview@example.test',
  fullName: 'Nguyễn Minh Anh', role: 'student', status: 'active', isEmailVerified: true,
};

async function waitFor(page, predicate, message) {
  for (let i = 0; i < 100; i++) {
    if (await page.eval(predicate)) return;
    await sleep(100);
  }
  throw new Error(message);
}

async function newPage(width = 1440, account = student, path = '/become-instructor', failMe = false) {
  const page = await browser.newPage({ width, height: width < 600 ? 844 : 900, mobile: width < 600, reducedMotion: true });
  let signedIn = account;
  const requests = [];
  let rejectMe = failMe;
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.clear();${account ? `localStorage.setItem('accessToken','fixture-token');localStorage.setItem('user',${JSON.stringify(JSON.stringify(account))});` : ''}`,
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
  browser.on(page.sessionId, 'Fetch.requestPaused', async ({ requestId, request }) => {
    const url = new URL(request.url);
    requests.push({ path: url.pathname, method: request.method });
    let data = [];
    let responseCode = request.method === 'OPTIONS' ? 204 : 200;
    if (url.pathname.endsWith('/auth/me')) {
      data = signedIn;
      if (rejectMe) responseCode = 503;
    } else if (url.pathname.endsWith('/auth/login') || url.pathname.endsWith('/auth/google')) {
      signedIn = student;
      data = { user: student, tokens: { accessToken: 'fixture-access', refreshToken: 'fixture-refresh' } };
    } else if (url.pathname.endsWith('/auth/logout')) {
      signedIn = null;
      data = { loggedOut: true };
    } else if (url.pathname.endsWith('/courses')) {
      data = { items: [], total: 0, page: 1, limit: 9, totalPages: 0 };
    }
    await page.send('Fetch.fulfillRequest', {
      requestId, responseCode,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
      body: request.method === 'OPTIONS' ? '' : Buffer.from(JSON.stringify({ success: responseCode === 200, data })).toString('base64'),
    }).catch(() => {});
  });
  await page.goto(`${origin}${path}`, { settleMs: 700 });
  page.fixtureRequests = requests;
  page.recoverAccount = () => { rejectMe = false; };
  return page;
}

async function clickText(page, text, selector = 'button') {
  await page.eval(({ text, selector }) => {
    const element = [...document.querySelectorAll(selector)].find((item) => item.textContent.trim() === text);
    if (!element) throw new Error(`Missing control: ${text}`);
    element.click();
  }, { text, selector });
}

async function check(name, run) {
  await run();
  results.push(name);
  console.log('PASS', name);
}

try {
  await check('guest: responsive page, lesson timeline, keyboard quiz and login return', async () => {
    const page = await newPage(1440, null);
    await waitFor(page, () => !!document.querySelector('[data-application-state="guest"]'), 'Guest page not ready');
    for (const width of [1440, 768, 390]) {
      await page.setViewport({ width, height: width === 390 ? 844 : 900, mobile: width === 390 });
      await page.eval(() => window.scrollTo(0, 0));
      const dimensions = await page.eval(() => ({
        document: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        header: document.querySelector('header').scrollWidth,
      }));
      assert.ok(dimensions.document <= width, `Page overflow at ${width}: ${JSON.stringify(dimensions)}`);
      assert.ok(dimensions.header <= width, `Header overflow at ${width}: ${JSON.stringify(dimensions)}`);
      await page.screenshot({ path: join(out, `guest-${width}.png`), format: 'png', fullPage: true });
    }
    await page.eval(() => document.querySelectorAll('[data-ui="mindly-lesson-preview"] button')[2].click());
    assert.match(await page.eval(() => document.querySelector('[data-ui="mindly-lesson-preview"] [aria-live]').textContent), /Kết hợp hai phía/);
    await page.eval(() => document.querySelector('input[value="client"]').focus());
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await clickText(page, 'Kiểm tra đáp án');
    assert.match(await page.eval(() => document.querySelector('[data-ui="mindly-quiz-preview"] [aria-live]').textContent), /Chính xác/);
    await page.eval(() => document.querySelector('main a[href^="/login?next="]').click());
    await waitFor(page, () => location.pathname === '/login' && !!document.querySelector('#password'), 'Login route not ready');
    assert.equal(await page.eval(() => new URLSearchParams(location.search).get('next')), '/become-instructor#registration');
    assert.match(await page.eval(() => document.querySelector('a[href^="/register?next="]').href), /next=/);
    await page.eval(() => {
      for (const [id, value] of [['email', 'instructor-preview@example.test'], ['password', 'FixturePassword123!']]) {
        const input = document.getElementById(id);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.querySelector('form').requestSubmit();
    });
    await waitFor(page, () => location.pathname === '/become-instructor' && !!document.querySelector('[data-application-state="not-applied"]'), 'Did not return after sign-in');
    assert.equal(await page.eval(() => location.hash), '#registration');
    assert.equal(page.consoleErrors.length, 0, page.consoleErrors.join('\n'));
    await page.close();
  });

  await check('student: avatar entry above logout on desktop/mobile and honest form draft', async () => {
    const page = await newPage();
    await waitFor(page, () => !!document.querySelector('button[aria-label="Menu tài khoản cá nhân"]'), 'Student header not ready');
    await page.eval(() => document.querySelector('button[aria-label="Menu tài khoản cá nhân"]').click());
    await waitFor(page, () => !!document.querySelector('[data-slot="popover-content"] a[href="/become-instructor"]'), 'Desktop entry missing');
    const order = await page.eval(() => [...document.querySelector('[data-slot="popover-content"]').querySelectorAll('a,button')].map((el) => el.textContent.trim()));
    assert.equal(order.at(-2), 'Trở thành giảng viên');
    assert.equal(order.at(-1), 'Đăng xuất');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.setViewport({ width: 390, height: 844, mobile: true });
    await page.eval(() => document.querySelector('button[aria-label="Mở danh mục điều hướng"]').click());
    const mobileOrder = await page.eval(() => [...document.querySelector('[data-ui="mobile-drawer-footer"]').querySelectorAll('a,button')].map((el) => el.textContent.trim()));
    assert.equal(mobileOrder.at(-2), 'Trở thành giảng viên');
    await page.eval(() => document.querySelector('[data-ui="mobile-drawer-footer"] a[href="/become-instructor"]').click());
    await waitFor(page, () => !document.querySelector('[data-ui="mobile-menu"]'), 'Drawer did not close');
    await page.eval(() => document.querySelector('[data-application-state="not-applied"] button').click());
    await waitFor(page, () => document.querySelector('#registration').textContent.includes('Hiện chưa có yêu cầu nào'), 'Draft notice missing');
    assert.equal(page.fixtureRequests.some((request) => /application|instructor-request/.test(request.path)), false);
    await page.screenshot({ path: join(out, 'student-draft.png'), format: 'png', fullPage: true });
    await page.close();
  });

  for (const status of ['pending', 'rejected']) {
    await check(`${status}: ${previewAllowed ? 'preview UI and avatar label' : 'preview ignored in production'}`, async () => {
      const page = await newPage(1440, student, `/become-instructor?preview=${status}#registration`);
      const expectedState = previewAllowed ? status : 'not-applied';
      await waitFor(page, () => !!document.querySelector('[data-application-state]'), 'Application not ready');
      assert.equal(await page.eval(() => document.querySelector('[data-application-state]').dataset.applicationState), expectedState);
      if (previewAllowed) {
        assert.equal(await page.eval(() => document.querySelector('#registration').textContent.includes('Dữ liệu mẫu')), true);
        await page.eval(() => { window.scrollTo(0, 0); document.querySelector('button[aria-label="Menu tài khoản cá nhân"]').click(); });
        const label = status === 'pending' ? 'Xem trạng thái đăng ký' : 'Xem kết quả / Đăng ký lại';
        await waitFor(page, () => !!document.querySelector('[data-slot="popover-content"]'), 'Menu missing');
        assert.match(await page.eval(() => document.querySelector('[data-slot="popover-content"]').textContent), new RegExp(label));
        assert.match(
          await page.eval(() => document.querySelector('[data-slot="popover-content"] a[href^="/become-instructor"]').getAttribute('href')),
          /#registration$/,
          'Status entry should open the registration section',
        );
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await waitFor(page, () => !document.querySelector('[data-slot="popover-content"]'), 'Menu did not close');
        if (status === 'pending') {
          assert.equal(await page.eval(() => document.querySelector('[data-application-state]').querySelectorAll('button').length), 0);
        } else {
          await clickText(page, 'Đăng ký lại');
          assert.equal(await page.eval(() => document.querySelector('[data-application-state]').textContent.includes('Chuẩn bị đăng ký lại')), true);
          await clickText(page, 'Quay lại kết quả');
        }
        await page.eval(() => document.getElementById('registration').scrollIntoView());
        await page.screenshot({ path: join(out, `${status}.png`), format: 'png' });
      } else {
        assert.equal(await page.eval(() => document.body.textContent.includes('Xem trước giao diện')), false);
      }
      await page.close();
    });
  }

  await check('account error: retry recovers instead of offering an unverified application', async () => {
    const page = await newPage(1440, student, '/become-instructor', true);
    await waitFor(page, () => !!document.querySelector('#registration [role="alert"]'), 'Account error not shown');
    assert.equal(await page.eval(() => document.querySelector('[data-application-state]')), null);
    page.recoverAccount();
    await clickText(page, 'Thử lại');
    await waitFor(page, () => !!document.querySelector('[data-application-state="not-applied"]'), 'Retry did not recover');
    await page.close();
  });

  for (const account of [null, student]) {
    await check(`home CTA and footer: ${account ? 'student' : 'guest'}`, async () => {
      const page = await newPage(390, account, '/');
      await waitFor(page, () => !!document.querySelector('[data-ui="cta-banner"] a'), 'Home CTA missing');
      const link = await page.eval(() => {
        const a = document.querySelector('[data-ui="cta-banner"] a');
        return { href: a.getAttribute('href'), label: a.textContent.trim() };
      });
      assert.equal(link.href, account ? '/become-instructor' : '/register');
      assert.equal(link.label, account ? 'Trở thành giảng viên' : 'Tạo tài khoản học viên miễn phí');
      assert.equal(await page.eval(() => document.querySelectorAll('footer a[href="/become-instructor"]').length), 1);
      await page.close();
    });
  }

  for (const [role, destination] of [['instructor', '/courses'], ['admin', '/admin']]) {
    await check(`${role}: routes to existing workspace without a registration form`, async () => {
      const page = await newPage(1440, { ...student, role });
      await waitFor(page, () => location.pathname !== '/become-instructor', 'Role redirect missing');
      assert.equal(await page.eval(() => location.pathname), destination);
      assert.equal(await page.eval(() => document.querySelector('[data-application-state]')), null);
      await page.close();
    });
  }
} finally {
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`Artifacts: ${out}`);
  await browser.close();
}
