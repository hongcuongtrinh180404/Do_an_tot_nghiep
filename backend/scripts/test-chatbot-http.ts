import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

// Manual caller of an already-running backend. Never logs JWTs or response bodies.
let httpStatus: number | undefined;
let stage = 'configuration';

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

  stage = 'request';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message:
        process.env.CHATBOT_HTTP_SMOKE_MESSAGE ?? 'Có khóa học React không?',
    }),
    signal: AbortSignal.timeout(45000),
    redirect: 'error',
  });
  httpStatus = response.status;
  assert.equal(response.status, 200);
  stage = 'verification';
  const body = (await response.json()) as {
    success: boolean;
    data: {
      requestId: string;
      status: string;
      answer: string;
      result?: {
        total: number;
        items: Array<{ id: string; title: string; price: number; url: string }>;
      };
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
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        httpStatus,
        replyStatus: body.data.status,
        total: body.data.result?.total,
        displayed: body.data.result?.items.length,
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
