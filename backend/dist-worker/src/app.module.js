var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
import { PublicProfileModule } from './modules/profile/public-profile.module.js';
import { ChatbotHttpModule } from './modules/chatbot/chatbot-http.module.js';
import { InstructorApplicationModule } from './modules/instructor-application/instructor-application.module.js';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module.js';
import { RabbitMqModule } from './modules/messaging/rabbitmq.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
                isGlobal: true,
                validationSchema: envValidationSchema,
            }),
            MongooseModule.forRootAsync({
                imports: [ConfigModule],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: configService.get('MONGODB_DB_NAME', 'thc_datn'),
                }),
                inject: [ConfigService],
            }),
            ClsModule.forRoot({
                global: true,
                middleware: { mount: true },
            }),
            RabbitMqModule,
            JobsModule,
            BaseModule,
            StorageModule,
            AssemblyAiModule,
            GeminiModule,
            ChatbotHttpModule,
            UserModule,
            SessionModule,
            AuthModule,
            CourseModule,
            EnrollmentModule,
            PaymentModule,
            TranscriptAnalysisModule,
            LearningProgressModule,
            ReviewModule,
            PublicProfileModule,
            InstructorApplicationModule,
            AdminDashboardModule,
        ],
        controllers: [AppController],
        providers: [AppService],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map