import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import type { PublicCourseSearchResult } from '../src/modules/course/interfaces/public-course-search.interface.js';

// Manual caller of an already-running backend. Never logs JWTs or response bodies.
let httpStatus: number | undefined;
let stage = 'configuration';

async function send(
  url: URL,
  token: string,
  message: string,
  context?: string,
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, ...(context ? { context } : {}) }),
    signal: AbortSignal.timeout(45000),
    redirect: 'error',
  });
  httpStatus = response.status;
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    success: boolean;
    data: {
      requestId: string;
      status: string;
      answer: string;
      context?: string;
      result?: PublicCourseSearchResult;
    };
  };
  assert.equal(body.success, true);
  assert.ok(
    ['found', 'empty', 'page_empty', 'needs_clarification'].includes(
      body.data.status,
    ),
  );
  assert.equal(typeof body.data.answer, 'string');
  assert.match(body.data.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(response.headers.get('x-request-id'), body.data.requestId);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (const item of body.data.result?.items ?? []) {
    assert.ok(typeof item.title === 'string' && item.title.length > 0);
    assert.ok(Number.isFinite(item.price) && item.price >= 0);
    assert.equal(item.url, `/courses/${encodeURIComponent(item.id)}`);
  }
  return body.data;
}

async function conversation(url: URL, token: string) {
  stage = 'conversation_initial';
  const first = await send(
    url,
    token,
    'Tìm khóa học lập trình dưới 200k, mỗi trang 2 khóa',
  );
  assert.ok(
    first.context && first.result?.hasMore,
    'A catalog with more than two programming courses is required',
  );
  const filters = first.result.filtersApplied;
  assert.equal(filters.maxPrice, 200000);
  assert.equal(filters.maxPriceExclusive, true);
  assert.equal(filters.limit, 2);
  assert.ok(first.result.items.every((item) => item.price < 200000));

  stage = 'conversation_next_page';
  const next = await send(url, token, 'Xem thêm', first.context);
  assert.ok(next.context && next.result);
  assert.deepEqual(next.result.filtersApplied, { ...filters, page: 2 });
  const ids = new Set(first.result.items.map((item) => item.id));
  assert.ok(next.result.items.every((item) => !ids.has(item.id)));

  stage = 'conversation_beginner';
  const beginner = await send(
    url,
    token,
    'Chỉ dành cho người mới',
    next.context,
  );
  assert.ok(beginner.context && beginner.result);
  assert.deepEqual(beginner.result.filtersApplied, {
    ...filters,
    page: 1,
    level: 'beginner',
  });
  assert.ok(
    beginner.result.items.every(
      (item) => item.level === 'beginner' && item.price < 200000,
    ),
  );

  stage = 'conversation_free';
  const free = await send(
    url,
    token,
    'Có khóa miễn phí không?',
    beginner.context,
  );
  assert.ok(free.context && free.result);
  assert.deepEqual(free.result.filtersApplied, {
    ...filters,
    page: 1,
    level: 'beginner',
    isFree: true,
  });
  assert.ok(free.result.items.every((item) => item.price === 0));

  stage = 'conversation_new_topic';
  const yoga = await send(url, token, 'Tìm khóa Yoga', free.context);
  assert.ok(yoga.result);
  assert.equal(yoga.result.filtersApplied.keyword?.toLowerCase(), 'yoga');
  for (const field of ['maxPrice', 'minPrice', 'level', 'isFree']) {
    assert.ok(!(field in yoga.result.filtersApplied));
  }
  assert.equal(yoga.result.page, 1);
  assert.equal(yoga.result.limit, 5);
  console.log(
    JSON.stringify({
      status: 'passed',
      httpStatus,
      requests: 5,
      checks: [
        'initial',
        'next_page_no_duplicates',
        'beginner_inheritance',
        'free_inheritance',
        'new_topic_reset',
      ],
    }),
  );
}

async function main(): Promise<void> {
  const envFile = new URL('../.env', import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
  const token = process.env.CHATBOT_HTTP_SMOKE_ACCESS_TOKEN?.trim();
  assert.ok(token, 'An existing Mindly access token is required');
  const prefix = (process.env.API_PREFIX ?? 'api/v1').replace(/^\/+|\/+$/g, '');
  const url = new URL(
    process.env.CHATBOT_HTTP_SMOKE_URL ??
      `http://127.0.0.1:${process.env.PORT ?? '8000'}/${prefix}/chatbot/messages`,
  );
  assert.ok(
    url.protocol === 'https:' ||
      (url.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)),
  );
  assert.ok(!url.username && !url.password && !url.search && !url.hash);
  const args = process.argv.slice(2);
  assert.ok(
    !args.length || (args.length === 1 && args[0] === '--conversation'),
  );
  if (args[0] === '--conversation') return conversation(url, token);

  stage = 'request';
  const data = await send(
    url,
    token,
    process.env.CHATBOT_HTTP_SMOKE_MESSAGE ?? 'Có khóa học React không?',
  );
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        httpStatus,
        replyStatus: data.status,
        total: data.result?.total,
        displayed: data.result?.items.length,
      },
      null,
      2,
    ),
  );
}

await main().catch(() => {
  console.error(
    JSON.stringify({
      status: 'failed',
      stage,
      httpStatus,
      code: 'CHATBOT_HTTP_SMOKE_FAILED',
    }),
  );
  process.exitCode = 1;
});
