var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqModule } from '../messaging/rabbitmq.module.js';
import { Job, JobSchema } from './schemas/job.schema.js';
import { JobRepository } from './repositories/job.repository.js';
import { JobService } from './services/job.service.js';
import { JobDispatcherService } from './services/job-dispatcher.service.js';
import { JobRecoveryService } from './services/job-recovery.service.js';
let JobsModule = class JobsModule {
};
JobsModule = __decorate([
    Module({
        imports: [
            ConfigModule,
            RabbitMqModule,
            MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
        ],
        providers: [
            JobRepository,
            JobService,
            JobDispatcherService,
            JobRecoveryService,
        ],
        exports: [
            JobRepository,
            JobService,
            JobDispatcherService,
            JobRecoveryService,
        ],
    })
], JobsModule);
export { JobsModule };
//# sourceMappingURL=jobs.module.js.map