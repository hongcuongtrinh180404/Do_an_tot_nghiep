import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqModule } from '../messaging/rabbitmq.module.js';
import { Job, JobSchema } from './schemas/job.schema.js';
import { JobRepository } from './repositories/job.repository.js';
import { JobService } from './services/job.service.js';
import { JobDispatcherService } from './services/job-dispatcher.service.js';
import { JobRecoveryService } from './services/job-recovery.service.js';

@Module({
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
export class JobsModule {}
