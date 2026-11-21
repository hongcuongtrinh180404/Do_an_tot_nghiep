import { ILessonSummary, ILessonSummaryData } from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';
import { GenerateSummaryDto } from '../dto/generate-summary.dto.js';
import { UpdateLessonSummaryDto } from '../dto/update-summary.dto.js';
export interface SummaryGenerationResponse {
    lessonId: string;
    summary: ILessonSummaryData;
    metadata: {
        model: string;
        keyIndex: number;
        maskedKey: string;
        executionTimeMs: number;
        usage?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    };
}
export declare class SummaryGenerationService {
    private readonly geminiService;
    private readonly lessonRepo;
    private readonly lessonTranscriptRepo;
    private readonly lessonSummaryRepo;
    private readonly logger;
    constructor(geminiService: GeminiService, lessonRepo: LessonRepository, lessonTranscriptRepo: LessonTranscriptRepository, lessonSummaryRepo: LessonSummaryRepository);
    formatTranscriptWithTimestamps(sentences: Array<{
        text: string;
        start: number;
        end: number;
    }>, rawTranscript: string): string;
    buildSummaryPrompt(lessonTitle: string, durationSeconds: number, formattedTranscript: string): string;
    generateSummary(lessonId: string, dto?: GenerateSummaryDto, userId?: string): Promise<SummaryGenerationResponse>;
    updateSummary(lessonId: string, dto: UpdateLessonSummaryDto, userId?: string): Promise<ILessonSummary>;
    getSummary(lessonId: string): Promise<ILessonSummary | null>;
    applyDraft(lessonId: string, userId?: string): Promise<ILessonSummary>;
}
