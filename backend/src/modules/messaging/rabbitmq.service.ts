import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConfirmChannel, ConsumeMessage, Options } from 'amqplib';
import { assertRabbitMqTopology, RABBITMQ_CONSTANTS } from './rabbitmq-topology.js';

export interface RabbitMqPublishOptions {
  correlationId?: string;
  messageId?: string;
  headers?: Record<string, unknown>;
  mandatory?: boolean;
}

export interface RabbitMqConsumerOptions {
  prefetch?: number;
}

export interface RabbitMqMessage<T = unknown> {
  content: T;
  rawMessage: ConsumeMessage;
  ack: () => void;
  nack: (requeue?: boolean) => void;
}

@Injectable()
export class RabbitMqService implements OnApplicationShutdown, BeforeApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: AmqpConnectionManager | null = null;
  private publisherChannel: ChannelWrapper | null = null;
  private consumerChannels: ChannelWrapper[] = [];
  private isShuttingDown = false;

  constructor(private readonly configService: ConfigService) {
    this.initConnection();
  }

  private initConnection(): void {
    const url = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://mindly:mindly_dev_password@localhost:5672/mindly',
    );
    const heartbeat = this.configService.get<number>('RABBITMQ_HEARTBEAT_SECONDS', 30);
    const reconnectSeconds = this.configService.get<number>('RABBITMQ_RECONNECT_SECONDS', 5);

    this.logger.log(`[RabbitMQ] Đang kết nối tới broker... (Heartbeat: ${heartbeat}s)`);

    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: heartbeat,
      reconnectTimeInSeconds: reconnectSeconds,
    });

    this.connection.on('connect', ({ url }) => {
      this.logger.log(`[RabbitMQ] Đã kết nối thành công tới ${url}`);
    });

    this.connection.on('disconnect', ({ err }) => {
      if (this.isShuttingDown) {
        this.logger.log('[RabbitMQ] Đã ngắt kết nối an toàn (Shutdown).');
        return;
      }
      this.logger.warn(`[RabbitMQ] Mất kết nối tới broker: ${err?.message || 'Không rõ nguyên nhân'}. Đang tự động kết nối lại...`);
    });

    this.connection.on('connectFailed', ({ err, url }) => {
      this.logger.error(`[RabbitMQ] Kết nối thất bại tới ${url}: ${err?.message}`);
    });

    // Tạo ConfirmChannel chuyên dụng cho Publisher
    this.publisherChannel = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        this.logger.log('[RabbitMQ] Thiết lập Publisher ConfirmChannel và xác minh Topology...');
        await assertRabbitMqTopology(channel);

        // Lắng nghe sự kiện unroutable message khi mandatory = true
        channel.on('return', (returnedMsg) => {
          this.logger.error(
            `[RabbitMQ] Message KHÔNG THỂ ĐỊNH TUYẾN (Unroutable Return): RoutingKey="${returnedMsg.fields.routingKey}", Exchange="${returnedMsg.fields.exchange}"`,
          );
        });
      },
    });
  }

  /**
   * Publish một message có Publisher Confirm lên RabbitMQ.
   * Mặc định persistent = true và mandatory = true để phát hiện message unroutable.
   */
  async publish<T>(
    routingKey: string,
    message: T,
    options: RabbitMqPublishOptions = {},
  ): Promise<boolean> {
    if (!this.publisherChannel) {
      throw new Error('RabbitMQ publisher channel chưa được khởi tạo');
    }

    const exchange = this.configService.get<string>(
      'RABBITMQ_EXCHANGE',
      RABBITMQ_CONSTANTS.EXCHANGE_TASKS,
    );

    const publishOptions: Options.Publish = {
      persistent: true,
      mandatory: options.mandatory ?? true,
      contentType: 'application/json',
      correlationId: options.correlationId,
      messageId: options.messageId,
      headers: options.headers,
    };

    try {
      await this.publisherChannel.publish(exchange, routingKey, message, publishOptions);
      return true;
    } catch (error: any) {
      this.logger.error(
        `[RabbitMQ] Publish thất bại [RoutingKey: ${routingKey}]: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Tạo một Consumer có Manual ACK và cấu hình Prefetch.
   */
  async createConsumer<T>(
    queueName: string,
    handler: (msg: RabbitMqMessage<T>) => Promise<void>,
    options: RabbitMqConsumerOptions = {},
  ): Promise<ChannelWrapper> {
    if (!this.connection) {
      throw new Error('RabbitMQ connection chưa sẵn sàng');
    }

    const prefetch = options.prefetch ?? this.configService.get<number>('AI_PREFETCH', 1);

    const consumerChannel = this.connection.createChannel({
      setup: async (channel: Channel) => {
        await assertRabbitMqTopology(channel);
        await channel.prefetch(prefetch);
        this.logger.log(`[RabbitMQ Consumer] Đã khởi tạo consumer cho queue "${queueName}" (Prefetch: ${prefetch})`);

        await channel.consume(
          queueName,
          async (msg: ConsumeMessage | null) => {
            if (!msg) return;

            let parsedContent: T;
            try {
              parsedContent = JSON.parse(msg.content.toString('utf-8')) as T;
            } catch (err: any) {
              this.logger.error(
                `[RabbitMQ Consumer] Lỗi parse JSON message [ID: ${msg.properties.messageId}]: ${err.message}. Đẩy sang DLQ.`,
              );
              // Nack không requeue để chuyển sang Dead Letter Queue
              channel.nack(msg, false, false);
              return;
            }

            const wrappedMsg: RabbitMqMessage<T> = {
              content: parsedContent,
              rawMessage: msg,
              ack: () => {
                try {
                  channel.ack(msg);
                } catch (e: any) {
                  this.logger.error(`[RabbitMQ Consumer] Lỗi ACK: ${e.message}`);
                }
              },
              nack: (requeue = false) => {
                try {
                  channel.nack(msg, false, requeue);
                } catch (e: any) {
                  this.logger.error(`[RabbitMQ Consumer] Lỗi NACK: ${e.message}`);
                }
              },
            };

            try {
              await handler(wrappedMsg);
            } catch (handlerErr: any) {
              this.logger.error(
                `[RabbitMQ Consumer] Lỗi xử lý message trong handler: ${handlerErr.message}`,
              );
              // Handler có thể tự gọi nack, nếu handler throw thì nack có requeue = false
              channel.nack(msg, false, false);
            }
          },
          { noAck: false },
        );
      },
    });

    this.consumerChannels.push(consumerChannel);
    return consumerChannel;
  }

  /**
   * Trả về AmqpConnectionManager hiện tại để kiểm tra kết nối
   */
  getConnection(): AmqpConnectionManager | null {
    return this.connection;
  }

  /**
   * Kiểm tra xem broker đã kết nối thành công chưa
   */
  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.log('[RabbitMQ] Đang chuẩn bị tắt dịch vụ messaging, dừng nhận message mới...');
    for (const channel of this.consumerChannels) {
      await channel.close().catch(() => {});
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('[RabbitMQ] Đang đóng Publisher Channel và Connection...');
    if (this.publisherChannel) {
      await this.publisherChannel.close().catch(() => {});
    }
    if (this.connection) {
      await this.connection.close().catch(() => {});
    }
    this.logger.log('[RabbitMQ] Dịch vụ messaging đã tắt hoàn tất.');
  }
}
