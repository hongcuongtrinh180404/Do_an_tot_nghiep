import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ILessonTranscript } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonTranscriptRepository } from '../repositories/lesson-transcript.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { StorageService } from '../../storage/index.js';
import { AssemblyAiService } from '../../assemblyai/index.js';
import { AudioExtractorService } from './audio-extractor.service.js';
export declare class LessonTranscriptService extends BaseService<ILessonTranscript, string> {
    private readonly lessonTranscriptRepo;
    private readonly lessonRepo;
    private readonly storageService;
    private readonly assemblyAiService;
    private readonly audioExtractorService;
    protected readonly logger: Logger;
    constructor(lessonTranscriptRepo: LessonTranscriptRepository, lessonRepo: LessonRepository, storageService: StorageService, assemblyAiService: AssemblyAiService, audioExtractorService: AudioExtractorService, cls: ClsService);
    getTranscriptByLessonId(lessonId: string): Promise<ILessonTranscript>;
    triggerTranscription(lessonId: string, videoKeyOrUrl: string): void;
    processTranscriptionTask(lessonId: string, videoKeyOrUrl: string): Promise<void>;
    retryTranscription(lessonId: string): Promise<void>;
}
