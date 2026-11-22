import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobRepository } from '../repositories/job.repository.js';
export declare class JobRecoveryService implements OnModuleInit, OnModuleDestroy {
    private readonly jobRepository;
    private readonly configService;
    private readonly logger;
    private timer;
    private isProcessing;
    private isShuttingDown;
    constructor(jobRepository: JobRepository, configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    recoverExpiredJobs(): Promise<number>;
}
