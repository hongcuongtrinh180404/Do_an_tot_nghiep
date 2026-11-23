var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { RabbitMqModule } from '../messaging/rabbitmq.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AssemblyAiModule } from '../assemblyai/assemblyai.module.js';
import { TranscriptAnalysisController } from './transcript-analysis.controller.js';
import { AnalysisJobsController } from './analysis-jobs.controller.js';
import { MindmapAnalysisService } from './services/mindmap-analysis.service.js';
import { QuizGenerationService } from './services/quiz-generation.service.js';
import { SummaryGenerationService } from './services/summary-generation.service.js';
import { AnalysisJobService } from './services/analysis-job.service.js';
import { JobManagementPolicy } from './policies/job-management.policy.js';
import { AnalysisJobProcessor } from './processors/analysis-job.processor.js';
import { TranscriptionJobProcessor } from './processors/transcription-job.processor.js';
let TranscriptAnalysisModule = class TranscriptAnalysisModule {
};
TranscriptAnalysisModule = __decorate([
    Module({
        imports: [
            CourseModule,
            GeminiModule,
            JobsModule,
            RabbitMqModule,
            StorageModule,
            AssemblyAiModule,
        ],
        controllers: [TranscriptAnalysisController, AnalysisJobsController],
        providers: [
            MindmapAnalysisService,
            QuizGenerationService,
            SummaryGenerationService,
            AnalysisJobService,
            JobManagementPolicy,
            AnalysisJobProcessor,
            TranscriptionJobProcessor,
        ],
        exports: [
            MindmapAnalysisService,
            QuizGenerationService,
            SummaryGenerationService,
            AnalysisJobService,
            JobManagementPolicy,
            AnalysisJobProcessor,
            TranscriptionJobProcessor,
        ],
    })
], TranscriptAnalysisModule);
export { TranscriptAnalysisModule };
//# sourceMappingURL=transcript-analysis.module.js.map