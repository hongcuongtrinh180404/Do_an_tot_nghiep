import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import { AssemblyAI, type Transcript, type TranscribeParams } from 'assemblyai';
import {
  IAssemblyAiService,
  AssemblyAiTranscribeOptions,
  AssemblyAiTranscriptionResult,
  TranscribedSentence,
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

  private async executeTranscription(
    audioSource: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult> {
    const client = this.getClient();
    const languageCode = options?.languageCode ?? this.defaultLanguageCode;

    this.logger.log(
      `Starting AssemblyAI transcription for audio source with language: ${languageCode}`,
    );

    const params: TranscribeParams = {
      audio: audioSource,
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

      const { sentences = [] } = await client.transcripts.sentences(transcript.id);
      const cleanedSentences: TranscribedSentence[] = (sentences ?? []).map(({ text, start, end }) => ({
        text: (text ?? '').trim(),
        start,
        end,
      }));

      const durationSeconds = Math.round(transcript.audio_duration ?? 0);

      this.logger.log(
        `Transcription finished successfully for ID: ${transcript.id}. Total sentences: ${cleanedSentences.length}, duration: ${durationSeconds}s`,
      );

      return {
        transcriptId: transcript.id,
        rawTranscript: (transcript.text ?? '').trim(),
        sentences: cleanedSentences,
        durationSeconds,
        languageCode: transcript.language_code ?? languageCode,
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

  async transcribe(
    audioUrl: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult> {
    const trimmedUrl = audioUrl?.trim();
    if (!trimmedUrl) {
      throw new BadRequestException('Audio/Video URL is required for transcription.');
    }
    return this.executeTranscription(trimmedUrl, options);
  }

  async transcribeStream(
    audioStream: NodeJS.ReadableStream | ReadableStream,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult> {
    if (!audioStream) {
      throw new BadRequestException('Audio stream is required for transcription.');
    }

    const client = this.getClient();
    this.logger.log('Uploading audio stream to AssemblyAI staging storage...');
    try {
      const uploadUrl = await client.files.upload(audioStream as never);
      this.logger.log('Audio stream uploaded to AssemblyAI successfully. Starting transcription...');
      return await this.executeTranscription(uploadUrl, options);
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload audio stream to AssemblyAI: ${message}`);
      throw new InternalServerErrorException(`Failed to upload audio stream to AssemblyAI: ${message}`);
    }
  }

  async submitTranscriptFile(
    filePath: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<string> {
    const trimmedPath = filePath?.trim();
    if (!trimmedPath) {
      throw new BadRequestException('Đường dẫn tệp âm thanh (filePath) không được để trống.');
    }

    if (!fs.existsSync(trimmedPath)) {
      throw new BadRequestException(`Không tìm thấy tệp âm thanh tại đường dẫn: ${trimmedPath}`);
    }

    const client = this.getClient();
    this.logger.log(`Uploading audio file ${trimmedPath} to AssemblyAI staging storage...`);
    try {
      const fileStream = fs.createReadStream(trimmedPath);
      const uploadUrl = await client.files.upload(fileStream as never);
      this.logger.log('Audio file uploaded to AssemblyAI. Submitting transcript job...');
      const languageCode = options?.languageCode ?? this.defaultLanguageCode;
      const transcript = await client.transcripts.submit({
        audio: uploadUrl,
        language_code: languageCode,
        punctuate: options?.punctuate ?? true,
        format_text: options?.formatText ?? true,
        speaker_labels: options?.speakerLabels ?? false,
      });
      this.logger.log(`Transcript job submitted successfully to AssemblyAI with ID: ${transcript.id}`);
      return transcript.id;
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to submit transcript job to AssemblyAI: ${message}`);
      throw new InternalServerErrorException(`Failed to submit transcript job to AssemblyAI: ${message}`);
    }
  }

  async pollTranscript(
    transcriptId: string,
    timeoutMs: number = 900000,
  ): Promise<AssemblyAiTranscriptionResult> {
    const trimmedId = transcriptId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('Transcript ID không được để trống khi poll.');
    }

    const client = this.getClient();
    const startTime = Date.now();
    const pollInterval = 3000;

    this.logger.log(`Starting polling for AssemblyAI transcript ID: ${trimmedId}...`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const transcript = await client.transcripts.get(trimmedId);

        if (transcript.status === 'completed') {
          const { sentences = [] } = await client.transcripts.sentences(transcript.id);
          const cleanedSentences: TranscribedSentence[] = (sentences ?? []).map(({ text, start, end }) => ({
            text: (text ?? '').trim(),
            start,
            end,
          }));

          const durationSeconds = Math.round(transcript.audio_duration ?? 0);
          this.logger.log(
            `Transcript polling completed for ID: ${trimmedId}. Sentences: ${cleanedSentences.length}, Duration: ${durationSeconds}s`,
          );

          return {
            transcriptId: transcript.id,
            rawTranscript: (transcript.text ?? '').trim(),
            sentences: cleanedSentences,
            durationSeconds,
            languageCode: transcript.language_code ?? this.defaultLanguageCode,
          };
        }

        if (transcript.status === 'error') {
          const errorMsg = transcript.error || 'Unknown AssemblyAI transcription error';
          this.logger.error(`AssemblyAI transcript ${trimmedId} failed with error: ${errorMsg}`);
          throw new InternalServerErrorException(`AssemblyAI transcription failed: ${errorMsg}`);
        }

        // Chờ trước lần poll tiếp theo
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error: unknown) {
        if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error polling transcript ${trimmedId}: ${message}`);
        throw new InternalServerErrorException(`Error polling transcript ${trimmedId}: ${message}`);
      }
    }

    throw new InternalServerErrorException(
      `AssemblyAI transcript ${trimmedId} timed out after ${Math.round(timeoutMs / 1000)}s`,
    );
  }

  async transcribeFile(
    filePath: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult> {
    const transcriptId = await this.submitTranscriptFile(filePath, options);
    return this.pollTranscript(transcriptId);
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
