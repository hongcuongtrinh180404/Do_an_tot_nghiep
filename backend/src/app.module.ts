import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { envValidationSchema } from './config/env.validation.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BaseModule } from './modules/base/base.module.js';
import { UserModule } from './modules/user/user.module.js';
import { SessionModule } from './modules/session/session.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CourseModule } from './modules/course/course.module.js';
import { EnrollmentModule } from './modules/enrollment/enrollment.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { AssemblyAiModule } from './modules/assemblyai/assemblyai.module.js';
import { GeminiModule } from './modules/gemini/gemini.module.js';
import { TranscriptAnalysisModule } from './modules/transcript-analysis/transcript-analysis.module.js';
import { LearningProgressModule } from './modules/learning-progress/learning-progress.module.js';
import { ReviewModule } from './modules/review/review.module.js';

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
      middleware: { mount: true },
    }),
    BaseModule,
    StorageModule,
    AssemblyAiModule,
    GeminiModule,
    UserModule,
    SessionModule,
    AuthModule,
    CourseModule,
    EnrollmentModule,
    PaymentModule,
    TranscriptAnalysisModule,
    LearningProgressModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
