import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';
import { JobRepository } from '../repositories/job.repository.js';
export interface JobMessagePayload {
    version: number;
    jobId: string;
    dispatchSequence: number;
    type: string;
    correlationId: string;
}
export declare class JobDispatcherService implements OnModuleInit, OnModuleDestroy {
    private readonly jobRepository;
    private readonly rabbitMqService;
    private readonly configService;
    private readonly logger;
    private timer;
    private isProcessing;
    private isShuttingDown;
    constructor(jobRepository: JobRepository, rabbitMqService: RabbitMqService, configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    dispatchPendingJobs(): Promise<number>;
}
