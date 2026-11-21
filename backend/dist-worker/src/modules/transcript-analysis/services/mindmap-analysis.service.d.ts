import { ILessonMindmap, ILessonMindmapData } from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonMindmapRepository } from '../../course/repositories/lesson-mindmap.repository.js';
import { GenerateMindmapDto } from '../dto/generate-mindmap.dto.js';
import { UpdateLessonMindmapDto } from '../dto/update-mindmap.dto.js';
export interface MindmapGenerationResponse {
    lessonId: string;
    mindmap: ILessonMindmapData;
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
export declare class MindmapAnalysisService {
    private readonly geminiService;
    private readonly lessonRepo;
    private readonly lessonTranscriptRepo;
    private readonly lessonMindmapRepo;
    private readonly logger;
    constructor(geminiService: GeminiService, lessonRepo: LessonRepository, lessonTranscriptRepo: LessonTranscriptRepository, lessonMindmapRepo: LessonMindmapRepository);
    formatTranscriptWithTimestamps(sentences: Array<{
        text: string;
        start: number;
        end: number;
    }>, rawTranscript: string): string;
    buildMindmapPrompt(lessonTitle: string, durationSeconds: number, formattedTranscript: string): string;
    generateMindmap(lessonId: string, dto?: GenerateMindmapDto, userId?: string): Promise<MindmapGenerationResponse>;
    getMindmap(lessonId: string): Promise<ILessonMindmap | null>;
    applyDraft(lessonId: string, userId?: string): Promise<ILessonMindmap>;
    updateMindmap(lessonId: string, dto: UpdateLessonMindmapDto, userId?: string): Promise<ILessonMindmap>;
}
