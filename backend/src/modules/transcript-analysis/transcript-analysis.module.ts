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
import { AutomaticAnalysisService } from './services/automatic-analysis.service.js';
import { BundleAnalysisService } from './services/bundle-analysis.service.js';
import { JobManagementPolicy } from './policies/job-management.policy.js';
import { AnalysisJobProcessor } from './processors/analysis-job.processor.js';
import { TranscriptionJobProcessor } from './processors/transcription-job.processor.js';

@Module({
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
    AutomaticAnalysisService,
    BundleAnalysisService,
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
export class TranscriptAnalysisModule {}
