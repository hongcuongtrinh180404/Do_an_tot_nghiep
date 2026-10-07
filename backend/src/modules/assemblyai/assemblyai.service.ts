import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssemblyAI, type Transcript, type TranscribeParams } from 'assemblyai';
import {
  IAssemblyAiService,
  AssemblyAiTranscribeOptions,
  AssemblyAiTranscriptionResult,
  TranscribedWord,
} from './interfaces/assemblyai.interface.js';

@Injectable()
export class AssemblyAiService implements IAssemblyAiService {
  private readonly logger = new Logger(AssemblyAiService.name);
  private client: AssemblyAI | null = null;
  private readonly apiKey: string;
  private readonly defaultLanguageCode: string = 'vi';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY', '').trim();
    if (this.apiKey) {
      this.client = new AssemblyAI({ apiKey: this.apiKey });
      this.logger.log('AssemblyAI client initialized successfully.');
    } else {
      this.logger.warn(
        'ASSEMBLYAI_API_KEY is not set. AssemblyAiService operations will fail until key is configured.',
      );
    }
  }

  private getClient(): AssemblyAI {
    if (!this.client) {
      const runtimeKey = this.configService.get<string>('ASSEMBLYAI_API_KEY', '').trim();
      if (runtimeKey) {
        this.client = new AssemblyAI({ apiKey: runtimeKey });
        return this.client;
      }
      throw new BadRequestException(
        'AssemblyAI API key is missing. Please configure ASSEMBLYAI_API_KEY in your environment.',
      );
    }
    return this.client;
  }

  async transcribe(
    audioUrl: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult> {
    const trimmedUrl = audioUrl?.trim();
    if (!trimmedUrl) {
      throw new BadRequestException('Audio/Video URL is required for transcription.');
    }

    const client = this.getClient();
    const languageCode = options?.languageCode ?? this.defaultLanguageCode;

    this.logger.log(
      `Starting AssemblyAI transcription for URL: ${trimmedUrl} with language: ${languageCode}`,
    );

    const params: TranscribeParams = {
      audio: trimmedUrl,
      language_code: languageCode,
      punctuate: options?.punctuate ?? true,
      format_text: options?.formatText ?? true,
      speaker_labels: options?.speakerLabels ?? false,
    };

    try {
      const transcript: Transcript = await client.transcripts.transcribe(params);

      if (transcript.status === 'error') {
        const errorMsg = transcript.error || 'Unknown AssemblyAI transcription error';
        this.logger.error(`AssemblyAI transcription error: ${errorMsg}`);
        throw new InternalServerErrorException(`AssemblyAI transcription failed: ${errorMsg}`);
      }

      const words: TranscribedWord[] = (transcript.words ?? []).map((w) => ({
        word: w.text,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      }));

      const durationSeconds = Math.round(transcript.audio_duration ?? 0);

      this.logger.log(
        `Transcription finished successfully for ID: ${transcript.id}. Total words: ${words.length}, duration: ${durationSeconds}s`,
      );

      return {
        transcriptId: transcript.id,
        rawTranscript: transcript.text ?? '',
        words,
        durationSeconds,
        languageCode: transcript.language_code ?? languageCode,
        confidence: transcript.confidence ?? undefined,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to transcribe audio with AssemblyAI: ${message}`);
      throw new InternalServerErrorException(`Failed to transcribe audio with AssemblyAI: ${message}`);
    }
  }

  async getSubtitles(transcriptId: string, format: 'srt' | 'vtt' = 'srt'): Promise<string> {
    const trimmedId = transcriptId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('Transcript ID is required to fetch subtitles.');
    }

    const client = this.getClient();
    try {
      const subtitles = await client.transcripts.subtitles(trimmedId, format);
      return subtitles;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve subtitles for transcript ID ${trimmedId}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to retrieve subtitles from AssemblyAI: ${message}`,
      );
    }
  }

  async getTranscript(transcriptId: string): Promise<Transcript> {
    const trimmedId = transcriptId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('Transcript ID is required.');
    }

    const client = this.getClient();
    try {
      const transcript = await client.transcripts.get(trimmedId);
      return transcript;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve transcript for ID ${trimmedId}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to retrieve transcript from AssemblyAI: ${message}`,
      );
    }
  }
}
