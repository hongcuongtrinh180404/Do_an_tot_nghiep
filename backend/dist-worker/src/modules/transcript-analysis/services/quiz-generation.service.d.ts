import type { ClientSession } from 'mongoose';
import { IGeneratedQuizItem, ILessonQuiz, ILessonQuizDraft } from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonQuizDraftRepository } from '../../course/repositories/lesson-quiz-draft.repository.js';
import { GenerateQuizDto } from '../dto/generate-quiz.dto.js';
export interface QuizGenerationResponse {
    lessonId: string;
    quizzes: IGeneratedQuizItem[];
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
export declare class QuizGenerationService {
    private readonly geminiService;
    private readonly lessonRepo;
    private readonly lessonTranscriptRepo;
    private readonly lessonQuizRepo;
    private readonly lessonQuizDraftRepo;
    private readonly logger;
    constructor(geminiService: GeminiService, lessonRepo: LessonRepository, lessonTranscriptRepo: LessonTranscriptRepository, lessonQuizRepo: LessonQuizRepository, lessonQuizDraftRepo: LessonQuizDraftRepository);
    formatTranscriptWithTimestamps(sentences: Array<{
        text: string;
        start: number;
        end: number;
    }>, rawTranscript: string): string;
    buildQuizPrompt(lessonTitle: string, durationSeconds: number, formattedTranscript: string, maxCount?: number): string;
    sanitizeAndNormalizeQuizzes(rawInput: unknown, durationSeconds: number, maxCount?: number): IGeneratedQuizItem[];
    generateQuizContent(lessonId: string, options?: {
        count?: number;
        expectedInputRevision?: number;
    }): Promise<{
        quizzes: IGeneratedQuizItem[];
        metadata: QuizGenerationResponse['metadata'];
    }>;
    persistQuizWithSession(lessonId: string, quizzes: IGeneratedQuizItem[], options?: {
        saveAsDraft?: boolean;
        userId?: string;
        session?: ClientSession;
    }): Promise<void>;
    generateQuiz(lessonId: string, dto?: GenerateQuizDto, userId?: string): Promise<QuizGenerationResponse>;
    getQuizDraft(lessonId: string): Promise<ILessonQuizDraft | null>;
    applyDraft(lessonId: string, _userId?: string): Promise<ILessonQuiz[]>;
}
