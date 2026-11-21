import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { AppModule } from './app.module.js';
import { AuditContextInterceptor, TransformInterceptor } from './modules/base/index.js';
import { CHATBOT_HTTP_EXPOSED_HEADERS } from './modules/chatbot/http/chatbot-http.constants.js';
async function bootstrap() {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    const configService = app.get(ConfigService);
    const apiPrefix = configService.get('API_PREFIX', 'api/v1');
    app.setGlobalPrefix(apiPrefix);
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const clsService = app.get(ClsService);
    app.useGlobalInterceptors(new AuditContextInterceptor(clsService), new TransformInterceptor());
    const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3000');
    app.enableCors({
        origin: corsOrigin,
        credentials: true,
        exposedHeaders: CHATBOT_HTTP_EXPOSED_HEADERS,
    });
    const port = configService.get('PORT', 8000);
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}
await bootstrap();
//# sourceMappingURL=main.js.map