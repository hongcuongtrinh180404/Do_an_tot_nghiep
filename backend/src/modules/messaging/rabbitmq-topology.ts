import { Channel, ConfirmChannel } from 'amqplib';

export const RABBITMQ_CONSTANTS = {
  EXCHANGE_TASKS: 'mindly.tasks.v1',
  EXCHANGE_DEAD: 'mindly.dead.v1',
  QUEUE_AI: 'mindly.ai.v1',
  QUEUE_AI_DEAD: 'mindly.ai.dead.v1',
  ROUTING_KEY_AI_DEAD: 'dead.ai',
  ROUTING_KEYS_AI: ['ai.summary', 'ai.quiz', 'ai.mindmap', 'ai.analysis-bundle'] as const,
  // Video Transcription Queue & Dead-letter Topology
  QUEUE_TRANSCRIPTION: 'mindly.transcription.v1',
  QUEUE_TRANSCRIPTION_DEAD: 'mindly.transcription.dead.v1',
  ROUTING_KEY_TRANSCRIPTION: 'video.transcribe',
  ROUTING_KEY_TRANSCRIPTION_DEAD: 'dead.transcription',
};

/**
 * Khai báo topology idempotent trên RabbitMQ.
 * Đảm bảo các exchange, queue, dead-letter và binding luôn tồn tại
 * khi channel được khởi tạo hoặc phục hồi kết nối.
 */
export async function assertRabbitMqTopology(channel: Channel | ConfirmChannel): Promise<void> {
  // 1. Assert Main Exchange (direct, durable)
  await channel.assertExchange(RABBITMQ_CONSTANTS.EXCHANGE_TASKS, 'direct', {
    durable: true,
  });

  // 2. Assert Dead Letter Exchange (direct, durable)
  await channel.assertExchange(RABBITMQ_CONSTANTS.EXCHANGE_DEAD, 'direct', {
    durable: true,
  });

  // 3. Assert Dead Letter Queue (durable) và liên kết vào DLX
  await channel.assertQueue(RABBITMQ_CONSTANTS.QUEUE_AI_DEAD, {
    durable: true,
  });
  await channel.bindQueue(
    RABBITMQ_CONSTANTS.QUEUE_AI_DEAD,
    RABBITMQ_CONSTANTS.EXCHANGE_DEAD,
    RABBITMQ_CONSTANTS.ROUTING_KEY_AI_DEAD,
  );

  // 4. Assert AI Queue (durable, có cấu hình x-dead-letter-exchange)
  await channel.assertQueue(RABBITMQ_CONSTANTS.QUEUE_AI, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': RABBITMQ_CONSTANTS.EXCHANGE_DEAD,
      'x-dead-letter-routing-key': RABBITMQ_CONSTANTS.ROUTING_KEY_AI_DEAD,
    },
  });

  // 5. Liên kết các routing keys của AI vào Queue AI
  for (const routingKey of RABBITMQ_CONSTANTS.ROUTING_KEYS_AI) {
    await channel.bindQueue(
      RABBITMQ_CONSTANTS.QUEUE_AI,
      RABBITMQ_CONSTANTS.EXCHANGE_TASKS,
      routingKey,
    );
  }

  // 6. Assert Dead Letter Queue cho Transcription và liên kết vào DLX
  await channel.assertQueue(RABBITMQ_CONSTANTS.QUEUE_TRANSCRIPTION_DEAD, {
    durable: true,
  });
  await channel.bindQueue(
    RABBITMQ_CONSTANTS.QUEUE_TRANSCRIPTION_DEAD,
    RABBITMQ_CONSTANTS.EXCHANGE_DEAD,
    RABBITMQ_CONSTANTS.ROUTING_KEY_TRANSCRIPTION_DEAD,
  );

  // 7. Assert Transcription Queue (durable, DLX sang mindly.dead.v1)
  await channel.assertQueue(RABBITMQ_CONSTANTS.QUEUE_TRANSCRIPTION, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': RABBITMQ_CONSTANTS.EXCHANGE_DEAD,
      'x-dead-letter-routing-key': RABBITMQ_CONSTANTS.ROUTING_KEY_TRANSCRIPTION_DEAD,
    },
  });

  // 8. Liên kết routing key 'video.transcribe' vào Transcription Queue
  await channel.bindQueue(
    RABBITMQ_CONSTANTS.QUEUE_TRANSCRIPTION,
    RABBITMQ_CONSTANTS.EXCHANGE_TASKS,
    RABBITMQ_CONSTANTS.ROUTING_KEY_TRANSCRIPTION,
  );
}
