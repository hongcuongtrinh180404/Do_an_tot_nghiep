import { Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { TranscriptAnalysisController } from './transcript-analysis.controller.js';
import { MindmapAnalysisService } from './services/mindmap-analysis.service.js';
import { QuizGenerationService } from './services/quiz-generation.service.js';
import { SummaryGenerationService } from './services/summary-generation.service.js';

@Module({
  imports: [CourseModule, GeminiModule],
  controllers: [TranscriptAnalysisController],
  providers: [
    MindmapAnalysisService,
    QuizGenerationService,
    SummaryGenerationService,
  ],
  exports: [
    MindmapAnalysisService,
    QuizGenerationService,
    SummaryGenerationService,
  ],
})
export class TranscriptAnalysisModule {}
