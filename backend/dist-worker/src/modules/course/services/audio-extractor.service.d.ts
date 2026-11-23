import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface IAudioExtractorService {
    extractMp3FromVideo(videoUrlOrPath: string, lessonId: string): Promise<string>;
    cleanupTempFile(filePath: string): Promise<void>;
    getFfmpegBinaryPath(): string;
}
export declare class AudioExtractorService implements IAudioExtractorService, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private readonly semaphore;
    private readonly activeProcesses;
    constructor(configService: ConfigService);
    onModuleDestroy(): void;
    getFfmpegBinaryPath(): string;
    extractMp3FromVideo(videoUrlOrPath: string, lessonId: string): Promise<string>;
    cleanupTempFile(filePath: string): Promise<void>;
}
