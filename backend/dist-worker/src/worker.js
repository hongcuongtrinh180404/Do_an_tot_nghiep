import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module.js';
async function bootstrap() {
    const logger = new Logger('WorkerBootstrap');
    logger.log('Đang khởi tạo Standalone Worker context...');
    const app = await NestFactory.createApplicationContext(WorkerModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });
    app.enableShutdownHooks();
    const shutdown = async (signal) => {
        logger.log(`Nhận tín hiệu ${signal}. Đang đóng Worker an toàn...`);
        await app.close();
        logger.log('Worker đã tắt an toàn.');
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    logger.log('🚀 Standalone Worker đã sẵn sàng nhận jobs từ RabbitMQ.');
}
bootstrap().catch((err) => {
    console.error('Lỗi khởi động Worker:', err);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map