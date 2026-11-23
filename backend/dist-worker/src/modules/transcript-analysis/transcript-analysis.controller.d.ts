import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ILessonMindmap, ILessonQuiz, ILessonQuizDraft, ILessonSummary } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { MindmapAnalysisService, MindmapGenerationResponse } from './services/mindmap-analysis.service.js';
import { QuizGenerationService, QuizGenerationResponse } from './services/quiz-generation.service.js';
import { SummaryGenerationService, SummaryGenerationResponse } from './services/summary-generation.service.js';
import { AnalysisJobService } from './services/analysis-job.service.js';
import { GenerateMindmapDto } from './dto/generate-mindmap.dto.js';
import { UpdateLessonMindmapDto } from './dto/update-mindmap.dto.js';
import { GenerateQuizDto } from './dto/generate-quiz.dto.js';
import { GenerateSummaryDto } from './dto/generate-summary.dto.js';
import { UpdateLessonSummaryDto } from './dto/update-summary.dto.js';
export declare class TranscriptAnalysisController {
    private readonly mindmapAnalysisService;
    private readonly quizGenerationService;
    private readonly summaryGenerationService;
    private readonly analysisJobService;
    private readonly configService;
    constructor(mindmapAnalysisService: MindmapAnalysisService, quizGenerationService: QuizGenerationService, summaryGenerationService: SummaryGenerationService, analysisJobService: AnalysisJobService, configService: ConfigService);
    private isAsyncEnabled;
    generateMindmap(id: string, dto: GenerateMindmapDto, userId?: string, idempotencyKey?: string, res?: Response): Promise<ApiResponse<MindmapGenerationResponse | {
        jobId: string;
        lessonId: string;
        type: string;
        status: string;
        phase: string;
        statusUrl: string;
    }>>;
    getMindmap(id: string): Promise<ApiResponse<ILessonMindmap | null>>;
    updateMindmap(id: string, dto: UpdateLessonMindmapDto, userId?: string): Promise<ApiResponse<ILessonMindmap>>;
    applyDraftMindmap(id: string, userId?: string): Promise<ApiResponse<ILessonMindmap>>;
    generateQuiz(id: string, dto: GenerateQuizDto, userId?: string, idempotencyKey?: string, res?: Response): Promise<ApiResponse<QuizGenerationResponse | {
        jobId: string;
        lessonId: string;
        type: string;
        status: string;
        phase: string;
        statusUrl: string;
    }>>;
    getQuizDraft(id: string): Promise<ApiResponse<ILessonQuizDraft | null>>;
    applyDraftQuiz(id: string, userId?: string): Promise<ApiResponse<ILessonQuiz[]>>;
    generateSummary(id: string, dto: GenerateSummaryDto, userId?: string, idempotencyKey?: string, res?: Response): Promise<ApiResponse<SummaryGenerationResponse | {
        jobId: string;
        lessonId: string;
        type: string;
        status: string;
        phase: string;
        statusUrl: string;
    }>>;
    getSummary(id: string): Promise<ApiResponse<ILessonSummary | null>>;
    updateSummary(id: string, dto: UpdateLessonSummaryDto, userId?: string): Promise<ApiResponse<ILessonSummary>>;
    applyDraftSummary(id: string, userId?: string): Promise<ApiResponse<ILessonSummary>>;
}
