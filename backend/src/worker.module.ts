import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { envValidationSchema } from './config/env.validation.js';
import { RabbitMqModule } from './modules/messaging/rabbitmq.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('MONGODB_DB_NAME', 'thc_datn'),
      }),
      inject: [ConfigService],
    }),
    ClsModule.forRoot({
      global: true,
    }),
    RabbitMqModule,
    JobsModule,
  ],
})
export class WorkerModule {}
