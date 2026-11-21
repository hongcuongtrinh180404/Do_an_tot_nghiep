import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { envValidationSchema } from './config/env.validation.js';
import { RabbitMqModule } from './modules/messaging/rabbitmq.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ClsModule.forRoot({
      global: true,
    }),
    RabbitMqModule,
  ],
})
export class WorkerModule {}
