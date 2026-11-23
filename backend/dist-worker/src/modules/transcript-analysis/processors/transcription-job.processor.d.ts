import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { AudioExtractorService } from '../../course/services/audio-extractor.service.js';
import { AssemblyAiService } from '../../assemblyai/assemblyai.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';
export declare class TranscriptionJobProcessor implements OnModuleInit {
    private readonly rabbitMqService;
    private readonly configService;
    private readonly jobService;
    private readonly jobRepository;
    private readonly lessonRepo;
    private readonly lessonTranscriptRepo;
    private readonly audioExtractorService;
    private readonly assemblyAiService;
    private readonly storageService;
    private readonly connection;
    private readonly logger;
    constructor(rabbitMqService: RabbitMqService, configService: ConfigService, jobService: JobService, jobRepository: JobRepository, lessonRepo: LessonRepository, lessonTranscriptRepo: LessonTranscriptRepository, audioExtractorService: AudioExtractorService, assemblyAiService: AssemblyAiService, storageService: StorageService, connection: Connection);
    onModuleInit(): Promise<void>;
    handleMessage(msg: RabbitMqMessage<JobMessagePayload>): Promise<void>;
    processTranscriptionJob(msg: RabbitMqMessage<JobMessagePayload>): Promise<void>;
}
