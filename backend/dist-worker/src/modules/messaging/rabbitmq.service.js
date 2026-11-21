var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RabbitMqService_1;
import { Injectable, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqp-connection-manager';
import { assertRabbitMqTopology, RABBITMQ_CONSTANTS } from './rabbitmq-topology.js';
let RabbitMqService = RabbitMqService_1 = class RabbitMqService {
    configService;
    logger = new Logger(RabbitMqService_1.name);
    connection = null;
    publisherChannel = null;
    consumerChannels = [];
    isShuttingDown = false;
    constructor(configService) {
        this.configService = configService;
        this.initConnection();
    }
    initConnection() {
        const url = this.configService.get('RABBITMQ_URL', 'amqp://mindly:mindly_dev_password@localhost:5672/mindly');
        const heartbeat = this.configService.get('RABBITMQ_HEARTBEAT_SECONDS', 30);
        const reconnectSeconds = this.configService.get('RABBITMQ_RECONNECT_SECONDS', 5);
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
        this.publisherChannel = this.connection.createChannel({
            json: true,
            setup: async (channel) => {
                this.logger.log('[RabbitMQ] Thiết lập Publisher ConfirmChannel và xác minh Topology...');
                await assertRabbitMqTopology(channel);
                channel.on('return', (returnedMsg) => {
                    this.logger.error(`[RabbitMQ] Message KHÔNG THỂ ĐỊNH TUYẾN (Unroutable Return): RoutingKey="${returnedMsg.fields.routingKey}", Exchange="${returnedMsg.fields.exchange}"`);
                });
            },
        });
    }
    async publish(routingKey, message, options = {}) {
        if (!this.publisherChannel) {
            throw new Error('RabbitMQ publisher channel chưa được khởi tạo');
        }
        const exchange = this.configService.get('RABBITMQ_EXCHANGE', RABBITMQ_CONSTANTS.EXCHANGE_TASKS);
        const publishOptions = {
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
        }
        catch (error) {
            this.logger.error(`[RabbitMQ] Publish thất bại [RoutingKey: ${routingKey}]: ${error?.message}`, error?.stack);
            throw error;
        }
    }
    async createConsumer(queueName, handler, options = {}) {
        if (!this.connection) {
            throw new Error('RabbitMQ connection chưa sẵn sàng');
        }
        const prefetch = options.prefetch ?? this.configService.get('AI_PREFETCH', 1);
        const consumerChannel = this.connection.createChannel({
            setup: async (channel) => {
                await assertRabbitMqTopology(channel);
                await channel.prefetch(prefetch);
                this.logger.log(`[RabbitMQ Consumer] Đã khởi tạo consumer cho queue "${queueName}" (Prefetch: ${prefetch})`);
                await channel.consume(queueName, async (msg) => {
                    if (!msg)
                        return;
                    let parsedContent;
                    try {
                        parsedContent = JSON.parse(msg.content.toString('utf-8'));
                    }
                    catch (err) {
                        this.logger.error(`[RabbitMQ Consumer] Lỗi parse JSON message [ID: ${msg.properties.messageId}]: ${err.message}. Đẩy sang DLQ.`);
                        channel.nack(msg, false, false);
                        return;
                    }
                    const wrappedMsg = {
                        content: parsedContent,
                        rawMessage: msg,
                        ack: () => {
                            try {
                                channel.ack(msg);
                            }
                            catch (e) {
                                this.logger.error(`[RabbitMQ Consumer] Lỗi ACK: ${e.message}`);
                            }
                        },
                        nack: (requeue = false) => {
                            try {
                                channel.nack(msg, false, requeue);
                            }
                            catch (e) {
                                this.logger.error(`[RabbitMQ Consumer] Lỗi NACK: ${e.message}`);
                            }
                        },
                    };
                    try {
                        await handler(wrappedMsg);
                    }
                    catch (handlerErr) {
                        this.logger.error(`[RabbitMQ Consumer] Lỗi xử lý message trong handler: ${handlerErr.message}`);
                        channel.nack(msg, false, false);
                    }
                }, { noAck: false });
            },
        });
        this.consumerChannels.push(consumerChannel);
        return consumerChannel;
    }
    getConnection() {
        return this.connection;
    }
    isConnected() {
        return this.connection?.isConnected() ?? false;
    }
    async beforeApplicationShutdown() {
        this.isShuttingDown = true;
        this.logger.log('[RabbitMQ] Đang chuẩn bị tắt dịch vụ messaging, dừng nhận message mới...');
        for (const channel of this.consumerChannels) {
            await channel.close().catch(() => { });
        }
    }
    async onApplicationShutdown() {
        this.logger.log('[RabbitMQ] Đang đóng Publisher Channel và Connection...');
        if (this.publisherChannel) {
            await this.publisherChannel.close().catch(() => { });
        }
        if (this.connection) {
            await this.connection.close().catch(() => { });
        }
        this.logger.log('[RabbitMQ] Dịch vụ messaging đã tắt hoàn tất.');
    }
};
RabbitMqService = RabbitMqService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], RabbitMqService);
export { RabbitMqService };
//# sourceMappingURL=rabbitmq.service.js.map