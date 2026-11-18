import 'reflect-metadata';
import assert, { AssertionError } from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ChatbotAiClient,
  ChatbotAiError,
  ChatbotModule,
  type ChatbotMessage,
  type ChatbotToolDefinition,
} from '../src/modules/chatbot/index.js';
import { parseChatbotConfig } from '../src/modules/chatbot/chatbot.config.js';

// This context loads only the chatbot infrastructure.
@Module({ imports: [ChatbotModule] })
class ChatbotSmokeModule {}

let stage = 'configuration';

async function main(): Promise<void> {
  const envFile = new URL('../.env', import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
  const config = parseChatbotConfig(process.env);
  if (!config.enabled) throw new ChatbotAiError('CHATBOT_DISABLED');

  const app = await NestFactory.createApplicationContext(ChatbotSmokeModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const client = app.get(ChatbotAiClient);
    const recordId = randomUUID();
    const tools: ChatbotToolDefinition[] = [
      {
        type: 'function',
        function: {
          name: 'read_synthetic_snapshot',
          description:
            'Read the synthetic test snapshot for a record. Values are only available through this function.',
          parameters: {
            type: 'object',
            properties: { recordId: { type: 'string', enum: [recordId] } },
            required: ['recordId'],
            additionalProperties: false,
          },
        },
      },
    ];
    const messages: ChatbotMessage[] = [
      {
        role: 'system',
        content:
          'This is a function-calling protocol test using synthetic data. You must call read_synthetic_snapshot to obtain the requested record. Never invent values. After the tool replies, output only its exact JSON object, with no Markdown or commentary.',
      },
      {
        role: 'user',
        content: `Read the synthetic snapshot for recordId "${recordId}".`,
      },
    ];

    stage = 'function_call';
    const first = await client.complete({ messages, tools });
    assert.equal(first.finishReason, 'tool_calls');
    assert.equal(first.assistantMessage.tool_calls?.length, 1);
    const call = first.assistantMessage.tool_calls?.[0];
    assert.ok(call);
    assert.equal(call.function.name, 'read_synthetic_snapshot');
    assert.deepEqual(JSON.parse(call.function.arguments), { recordId });

    // Generate the answer only after the first response: the model cannot guess it.
    const snapshot = {
      recordId,
      nonce: randomUUID(),
      progressPercent: randomInt(1, 100),
      remainingLessons: randomInt(1, 80),
    };
    stage = 'continuation';
    const final = await client.complete({
      messages: [
        ...messages,
        first.assistantMessage,
        {
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(snapshot),
        },
      ],
      tools,
      toolChoice: 'none',
    });

    stage = 'verification';
    assert.equal(final.finishReason, 'stop');
    assert.deepEqual(
      JSON.parse(final.assistantMessage.content ?? ''),
      snapshot,
    );
    console.log(
      JSON.stringify(
        {
          status: 'passed',
          providerRequests: 2,
          functionCalls: 1,
          matchedSyntheticResult: true,
          durationMs: first.durationMs + final.durationMs,
          usage: { first: first.usage, final: final.usage },
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

await main().catch((error: unknown) => {
  // Neither SDK errors nor assertion diffs (which may contain responses) are printed.
  console.error(
    JSON.stringify({
      status: 'failed',
      stage,
      code:
        error instanceof ChatbotAiError
          ? error.code
          : error instanceof AssertionError || error instanceof SyntaxError
            ? 'CHATBOT_SMOKE_ASSERTION_FAILED'
            : 'CHATBOT_SMOKE_FAILED',
      ...(error instanceof ChatbotAiError && error.configurationFields.length
        ? { configurationFields: error.configurationFields }
        : {}),
    }),
  );
  process.exitCode = 1;
});
