import { Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { TranscriptAnalysisController } from './transcript-analysis.controller.js';
import { AnalysisJobsController } from './analysis-jobs.controller.js';
import { MindmapAnalysisService } from './services/mindmap-analysis.service.js';
import { QuizGenerationService } from './services/quiz-generation.service.js';
import { SummaryGenerationService } from './services/summary-generation.service.js';
import { AnalysisJobService } from './services/analysis-job.service.js';
import { JobManagementPolicy } from './policies/job-management.policy.js';

@Module({
  imports: [CourseModule, GeminiModule, JobsModule],
  controllers: [TranscriptAnalysisController, AnalysisJobsController],
  providers: [
    MindmapAnalysisService,
    QuizGenerationService,
    SummaryGenerationService,
    AnalysisJobService,
    JobManagementPolicy,
  ],
  exports: [
    MindmapAnalysisService,
    QuizGenerationService,
    SummaryGenerationService,
    AnalysisJobService,
    JobManagementPolicy,
  ],
})
export class TranscriptAnalysisModule {}
