var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssemblyAiService_1;
import { Injectable, Logger, BadRequestException, InternalServerErrorException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import { AssemblyAI } from 'assemblyai';
let AssemblyAiService = AssemblyAiService_1 = class AssemblyAiService {
    configService;
    logger = new Logger(AssemblyAiService_1.name);
    client = null;
    apiKey;
    defaultLanguageCode = 'vi';
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('ASSEMBLYAI_API_KEY', '').trim();
        if (this.apiKey) {
            this.client = new AssemblyAI({ apiKey: this.apiKey });
            this.logger.log('AssemblyAI client initialized successfully.');
        }
        else {
            this.logger.warn('ASSEMBLYAI_API_KEY is not set. AssemblyAiService operations will fail until key is configured.');
        }
    }
    getClient() {
        if (!this.client) {
            const runtimeKey = this.configService.get('ASSEMBLYAI_API_KEY', '').trim();
            if (runtimeKey) {
                this.client = new AssemblyAI({ apiKey: runtimeKey });
                return this.client;
            }
            throw new BadRequestException('AssemblyAI API key is missing. Please configure ASSEMBLYAI_API_KEY in your environment.');
        }
        return this.client;
    }
    async executeTranscription(audioSource, options) {
        const client = this.getClient();
        const languageCode = options?.languageCode ?? this.defaultLanguageCode;
        this.logger.log(`Starting AssemblyAI transcription for audio source with language: ${languageCode}`);
        const params = {
            audio: audioSource,
            language_code: languageCode,
            punctuate: options?.punctuate ?? true,
            format_text: options?.formatText ?? true,
            speaker_labels: options?.speakerLabels ?? false,
        };
        try {
            const transcript = await client.transcripts.transcribe(params);
            if (transcript.status === 'error') {
                const errorMsg = transcript.error || 'Unknown AssemblyAI transcription error';
                this.logger.error(`AssemblyAI transcription error: ${errorMsg}`);
                throw new InternalServerErrorException(`AssemblyAI transcription failed: ${errorMsg}`);
            }
            const { sentences = [] } = await client.transcripts.sentences(transcript.id);
            const cleanedSentences = (sentences ?? []).map(({ text, start, end }) => ({
                text: (text ?? '').trim(),
                start,
                end,
            }));
            const durationSeconds = Math.round(transcript.audio_duration ?? 0);
            this.logger.log(`Transcription finished successfully for ID: ${transcript.id}. Total sentences: ${cleanedSentences.length}, duration: ${durationSeconds}s`);
            return {
                transcriptId: transcript.id,
                rawTranscript: (transcript.text ?? '').trim(),
                sentences: cleanedSentences,
                durationSeconds,
                languageCode: transcript.language_code ?? languageCode,
            };
        }
        catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to transcribe audio with AssemblyAI: ${message}`);
            throw new InternalServerErrorException(`Failed to transcribe audio with AssemblyAI: ${message}`);
        }
    }
    async transcribe(audioUrl, options) {
        const trimmedUrl = audioUrl?.trim();
        if (!trimmedUrl) {
            throw new BadRequestException('Audio/Video URL is required for transcription.');
        }
        return this.executeTranscription(trimmedUrl, options);
    }
    async transcribeStream(audioStream, options) {
        if (!audioStream) {
            throw new BadRequestException('Audio stream is required for transcription.');
        }
        const client = this.getClient();
        this.logger.log('Uploading audio stream to AssemblyAI staging storage...');
        try {
            const uploadUrl = await client.files.upload(audioStream);
            this.logger.log('Audio stream uploaded to AssemblyAI successfully. Starting transcription...');
            return await this.executeTranscription(uploadUrl, options);
        }
        catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to upload audio stream to AssemblyAI: ${message}`);
            throw new InternalServerErrorException(`Failed to upload audio stream to AssemblyAI: ${message}`);
        }
    }
    async submitTranscriptFile(filePath, options) {
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
            const uploadUrl = await client.files.upload(fileStream);
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
        }
        catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to submit transcript job to AssemblyAI: ${message}`);
            throw new InternalServerErrorException(`Failed to submit transcript job to AssemblyAI: ${message}`);
        }
    }
    async pollTranscript(transcriptId, timeoutMs = 900000) {
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
                    const cleanedSentences = (sentences ?? []).map(({ text, start, end }) => ({
                        text: (text ?? '').trim(),
                        start,
                        end,
                    }));
                    const durationSeconds = Math.round(transcript.audio_duration ?? 0);
                    this.logger.log(`Transcript polling completed for ID: ${trimmedId}. Sentences: ${cleanedSentences.length}, Duration: ${durationSeconds}s`);
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
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
            catch (error) {
                if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                    throw error;
                }
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Error polling transcript ${trimmedId}: ${message}`);
                throw new InternalServerErrorException(`Error polling transcript ${trimmedId}: ${message}`);
            }
        }
        throw new InternalServerErrorException(`AssemblyAI transcript ${trimmedId} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    async transcribeFile(filePath, options) {
        const transcriptId = await this.submitTranscriptFile(filePath, options);
        return this.pollTranscript(transcriptId);
    }
    async getSubtitles(transcriptId, format = 'srt') {
        const trimmedId = transcriptId?.trim();
        if (!trimmedId) {
            throw new BadRequestException('Transcript ID is required to fetch subtitles.');
        }
        const client = this.getClient();
        try {
            const subtitles = await client.transcripts.subtitles(trimmedId, format);
            return subtitles;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to retrieve subtitles for transcript ID ${trimmedId}: ${message}`);
            throw new InternalServerErrorException(`Failed to retrieve subtitles from AssemblyAI: ${message}`);
        }
    }
    async getTranscript(transcriptId) {
        const trimmedId = transcriptId?.trim();
        if (!trimmedId) {
            throw new BadRequestException('Transcript ID is required.');
        }
        const client = this.getClient();
        try {
            const transcript = await client.transcripts.get(trimmedId);
            return transcript;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to retrieve transcript for ID ${trimmedId}: ${message}`);
            throw new InternalServerErrorException(`Failed to retrieve transcript from AssemblyAI: ${message}`);
        }
    }
};
AssemblyAiService = AssemblyAiService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], AssemblyAiService);
export { AssemblyAiService };
//# sourceMappingURL=assemblyai.service.js.map