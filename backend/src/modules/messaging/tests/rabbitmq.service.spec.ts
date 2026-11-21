import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService } from '../rabbitmq.service.js';
import { RABBITMQ_CONSTANTS } from '../rabbitmq-topology.js';

describe('RabbitMqService (Unit Test)', () => {
  let service: RabbitMqService;
  let mockConfigService: ConfigService;
  let mockConnection: any;
  let mockPublisherChannel: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          RABBITMQ_URL: 'amqp://localhost:5672',
          RABBITMQ_EXCHANGE: RABBITMQ_CONSTANTS.EXCHANGE_TASKS,
          RABBITMQ_HEARTBEAT_SECONDS: 30,
          RABBITMQ_RECONNECT_SECONDS: 5,
          AI_PREFETCH: 1,
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    mockPublisherChannel = {
      publish: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };

    mockConnection = {
      createChannel: vi.fn().mockReturnValue(mockPublisherChannel),
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('nên khởi tạo RabbitMqService và tạo Publisher ConfirmChannel', () => {
    service = new RabbitMqService(mockConfigService);
    expect(service).toBeDefined();
    expect(service.getConnection()).toBeDefined();
  });

  it('nên publish message với persistent: true và mandatory: true', async () => {
    service = new RabbitMqService(mockConfigService);

    // Gán mock channel vào service
    (service as any).publisherChannel = mockPublisherChannel;

    const payload = { jobId: 'job-123', type: 'summary' };
    const result = await service.publish('ai.summary', payload, {
      correlationId: 'req-corr-1',
      messageId: 'msg-1',
    });

    expect(result).toBe(true);
    expect(mockPublisherChannel.publish).toHaveBeenCalledWith(
      RABBITMQ_CONSTANTS.EXCHANGE_TASKS,
      'ai.summary',
      payload,
      expect.objectContaining({
        persistent: true,
        mandatory: true,
        contentType: 'application/json',
        correlationId: 'req-corr-1',
        messageId: 'msg-1',
      }),
    );
  });

  it('nên ném lỗi khi publish thất bại', async () => {
    service = new RabbitMqService(mockConfigService);
    (service as any).publisherChannel = {
      publish: vi.fn().mockRejectedValue(new Error('Broker nacked')),
    };

    await expect(
      service.publish('ai.summary', { test: true }),
    ).rejects.toThrow('Broker nacked');
  });

  it('nên đóng channel và connection an toàn khi shutdown', async () => {
    service = new RabbitMqService(mockConfigService);
    (service as any).publisherChannel = mockPublisherChannel;
    (service as any).connection = mockConnection;

    await service.beforeApplicationShutdown();
    await service.onApplicationShutdown();

    expect(mockPublisherChannel.close).toHaveBeenCalled();
    expect(mockConnection.close).toHaveBeenCalled();
  });
});
