import { ConfigService } from '@nestjs/config';
export interface IAudioExtractorService {
    extractMp3FromVideo(videoUrlOrPath: string, lessonId: string): Promise<string>;
    cleanupTempFile(filePath: string): Promise<void>;
    getFfmpegBinaryPath(): string;
}
export declare class AudioExtractorService implements IAudioExtractorService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    getFfmpegBinaryPath(): string;
    extractMp3FromVideo(videoUrlOrPath: string, lessonId: string): Promise<string>;
    cleanupTempFile(filePath: string): Promise<void>;
}
