import { ILessonMindmap, ILessonQuiz, ILessonQuizDraft, ILessonSummary } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { MindmapAnalysisService, MindmapGenerationResponse } from './services/mindmap-analysis.service.js';
import { QuizGenerationService, QuizGenerationResponse } from './services/quiz-generation.service.js';
import { SummaryGenerationService, SummaryGenerationResponse } from './services/summary-generation.service.js';
import { GenerateMindmapDto } from './dto/generate-mindmap.dto.js';
import { UpdateLessonMindmapDto } from './dto/update-mindmap.dto.js';
import { GenerateQuizDto } from './dto/generate-quiz.dto.js';
import { GenerateSummaryDto } from './dto/generate-summary.dto.js';
import { UpdateLessonSummaryDto } from './dto/update-summary.dto.js';
export declare class TranscriptAnalysisController {
    private readonly mindmapAnalysisService;
    private readonly quizGenerationService;
    private readonly summaryGenerationService;
    constructor(mindmapAnalysisService: MindmapAnalysisService, quizGenerationService: QuizGenerationService, summaryGenerationService: SummaryGenerationService);
    generateMindmap(id: string, dto: GenerateMindmapDto, userId?: string): Promise<ApiResponse<MindmapGenerationResponse>>;
    getMindmap(id: string): Promise<ApiResponse<ILessonMindmap | null>>;
    updateMindmap(id: string, dto: UpdateLessonMindmapDto, userId?: string): Promise<ApiResponse<ILessonMindmap>>;
    applyDraftMindmap(id: string, userId?: string): Promise<ApiResponse<ILessonMindmap>>;
    generateQuiz(id: string, dto: GenerateQuizDto, userId?: string): Promise<ApiResponse<QuizGenerationResponse>>;
    getQuizDraft(id: string): Promise<ApiResponse<ILessonQuizDraft | null>>;
    applyDraftQuiz(id: string, userId?: string): Promise<ApiResponse<ILessonQuiz[]>>;
    generateSummary(id: string, dto: GenerateSummaryDto, userId?: string): Promise<ApiResponse<SummaryGenerationResponse>>;
    getSummary(id: string): Promise<ApiResponse<ILessonSummary | null>>;
    updateSummary(id: string, dto: UpdateLessonSummaryDto, userId?: string): Promise<ApiResponse<ILessonSummary>>;
    applyDraftSummary(id: string, userId?: string): Promise<ApiResponse<ILessonSummary>>;
}
