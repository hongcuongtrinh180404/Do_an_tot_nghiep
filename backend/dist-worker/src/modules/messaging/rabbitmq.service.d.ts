import { OnApplicationShutdown, BeforeApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
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
export declare class RabbitMqService implements OnApplicationShutdown, BeforeApplicationShutdown {
    private readonly configService;
    private readonly logger;
    private connection;
    private publisherChannel;
    private consumerChannels;
    private isShuttingDown;
    constructor(configService: ConfigService);
    private initConnection;
    publish<T>(routingKey: string, message: T, options?: RabbitMqPublishOptions): Promise<boolean>;
    createConsumer<T>(queueName: string, handler: (msg: RabbitMqMessage<T>) => Promise<void>, options?: RabbitMqConsumerOptions): Promise<ChannelWrapper>;
    getConnection(): AmqpConnectionManager | null;
    isConnected(): boolean;
    beforeApplicationShutdown(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
}
