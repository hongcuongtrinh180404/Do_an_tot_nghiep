import { ConfigService } from '@nestjs/config';
import { type Transcript } from 'assemblyai';
import { IAssemblyAiService, AssemblyAiTranscribeOptions, AssemblyAiTranscriptionResult } from './interfaces/assemblyai.interface.js';
export declare class AssemblyAiService implements IAssemblyAiService {
    private readonly configService;
    private readonly logger;
    private client;
    private readonly apiKey;
    private readonly defaultLanguageCode;
    constructor(configService: ConfigService);
    private getClient;
    private executeTranscription;
    transcribe(audioUrl: string, options?: Partial<AssemblyAiTranscribeOptions>): Promise<AssemblyAiTranscriptionResult>;
    transcribeStream(audioStream: NodeJS.ReadableStream | ReadableStream, options?: Partial<AssemblyAiTranscribeOptions>): Promise<AssemblyAiTranscriptionResult>;
    transcribeFile(filePath: string, options?: Partial<AssemblyAiTranscribeOptions>): Promise<AssemblyAiTranscriptionResult>;
    getSubtitles(transcriptId: string, format?: 'srt' | 'vtt'): Promise<string>;
    getTranscript(transcriptId: string): Promise<Transcript>;
}
