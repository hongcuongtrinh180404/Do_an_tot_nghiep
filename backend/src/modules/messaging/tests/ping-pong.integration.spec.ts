import { describe, it, expect, afterAll } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RabbitMqService } from '../rabbitmq.service.js';
import { RABBITMQ_CONSTANTS } from '../rabbitmq-topology.js';

describe('RabbitMQ Ping-Pong Integration Test', () => {
  let service: RabbitMqService;

  afterAll(async () => {
    if (service) {
      await service.beforeApplicationShutdown();
      await service.onApplicationShutdown();
    }
  });

  it('nên publish message và consume message thành công với Manual ACK', async () => {
    const configService = {
      get: (key: string, defaultValue?: any) => {
        const env: Record<string, any> = {
          RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://mindly:mindly_dev_password@localhost:5672/mindly',
          RABBITMQ_EXCHANGE: RABBITMQ_CONSTANTS.EXCHANGE_TASKS,
          RABBITMQ_HEARTBEAT_SECONDS: 30,
          RABBITMQ_RECONNECT_SECONDS: 5,
          AI_PREFETCH: 1,
        };
        return env[key] ?? defaultValue;
      },
    } as unknown as ConfigService;

    service = new RabbitMqService(configService);

    // Chờ broker kết nối (tối đa 5s)
    let connected = false;
    for (let i = 0; i < 25; i++) {
      if (service.isConnected()) {
        connected = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!connected) {
      console.warn('⚠️ RabbitMQ broker chưa khởi chạy, bỏ qua bài test integration.');
      return;
    }

    const testCorrelationId = `test-corr-${randomUUID()}`;
    const testPayload = {
      version: 1,
      jobId: `job-test-${randomUUID()}`,
      type: 'summary',
      timestamp: new Date().toISOString(),
    };

    // Tạo promise chờ consumer nhận message
    const receivedPromise = new Promise<{ receivedContent: any; ackCalled: boolean }>((resolve) => {
      service.createConsumer<typeof testPayload>(
        RABBITMQ_CONSTANTS.QUEUE_AI,
        async (msg) => {
          if (msg.content.jobId === testPayload.jobId) {
            msg.ack();
            resolve({ receivedContent: msg.content, ackCalled: true });
          } else {
            // Không phải message của bài test này (có thể sót lại từ trước), nack requeue
            msg.nack(true);
          }
        },
        { prefetch: 1 },
      );
    });

    // Chờ 500ms để consumer bind queue hoàn tất
    await new Promise((r) => setTimeout(r, 500));

    // Publish message
    const publishResult = await service.publish('ai.summary', testPayload, {
      correlationId: testCorrelationId,
      messageId: testPayload.jobId,
    });

    expect(publishResult).toBe(true);

    // Chờ nhận message (timeout 5s)
    const result = await Promise.race([
      receivedPromise,
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout chờ message từ RabbitMQ')), 5000)),
    ]);

    expect(result).toBeDefined();
    expect(result?.ackCalled).toBe(true);
    expect(result?.receivedContent.jobId).toBe(testPayload.jobId);
    expect(result?.receivedContent.type).toBe('summary');
  });
});
