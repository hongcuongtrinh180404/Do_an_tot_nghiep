import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseEntity, CourseSchema } from './schemas/course.schema.js';
import { SectionEntity, SectionSchema } from './schemas/section.schema.js';
import { LessonEntity, LessonSchema } from './schemas/lesson.schema.js';
import { CourseMindmapEntity, CourseMindmapSchema } from './schemas/course-mindmap.schema.js';
import { LessonTranscriptEntity, LessonTranscriptSchema } from './schemas/lesson-transcript.schema.js';
import { LessonQuizEntity, LessonQuizSchema } from './schemas/lesson-quiz.schema.js';
import { LessonMindmapEntity, LessonMindmapSchema } from './schemas/lesson-mindmap.schema.js';
import { LessonSummaryEntity, LessonSummarySchema } from './schemas/lesson-summary.schema.js';
import { LessonQuizDraftEntity, LessonQuizDraftSchema } from './schemas/lesson-quiz-draft.schema.js';
import { CourseController } from './course.controller.js';
import { CourseMindmapController } from './course-mindmap.controller.js';
import { LessonController } from './lesson.controller.js';
import { LessonsController } from './lessons.controller.js';
import { LessonContentController } from './lesson-content.controller.js';
import { LessonQuizController } from './lesson-quiz.controller.js';
import { CourseRepository } from './repositories/course.repository.js';
import { SectionRepository } from './repositories/section.repository.js';
import { LessonRepository } from './repositories/lesson.repository.js';
import { CourseMindmapRepository } from './repositories/course-mindmap.repository.js';
import { LessonTranscriptRepository } from './repositories/lesson-transcript.repository.js';
import { LessonQuizRepository } from './repositories/lesson-quiz.repository.js';
import { LessonMindmapRepository } from './repositories/lesson-mindmap.repository.js';
import { LessonSummaryRepository } from './repositories/lesson-summary.repository.js';
import { LessonQuizDraftRepository } from './repositories/lesson-quiz-draft.repository.js';
import { CourseService } from './services/course.service.js';
import { LessonService } from './services/lesson.service.js';
import { CourseMindmapService } from './services/course-mindmap.service.js';
import { LessonTranscriptService } from './services/lesson-transcript.service.js';
import { LessonQuizService } from './services/lesson-quiz.service.js';
import { AudioExtractorService } from './services/audio-extractor.service.js';
import { UserModule } from '../user/user.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AssemblyAiModule } from '../assemblyai/assemblyai.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
      { name: SectionEntity.name, schema: SectionSchema },
      { name: LessonEntity.name, schema: LessonSchema },
      { name: CourseMindmapEntity.name, schema: CourseMindmapSchema },
      { name: LessonTranscriptEntity.name, schema: LessonTranscriptSchema },
      { name: LessonQuizEntity.name, schema: LessonQuizSchema },
      { name: LessonMindmapEntity.name, schema: LessonMindmapSchema },
      { name: LessonSummaryEntity.name, schema: LessonSummarySchema },
      { name: LessonQuizDraftEntity.name, schema: LessonQuizDraftSchema },
    ]),
    UserModule,
    StorageModule,
    AssemblyAiModule,
  ],
  controllers: [
    CourseController,
    CourseMindmapController,
    LessonController,
    LessonsController,
    LessonContentController,
    LessonQuizController,
  ],
  providers: [
    CourseRepository,
    SectionRepository,
    LessonRepository,
    CourseMindmapRepository,
    LessonTranscriptRepository,
    LessonQuizRepository,
    LessonMindmapRepository,
    LessonSummaryRepository,
    LessonQuizDraftRepository,
    CourseService,
    LessonService,
    CourseMindmapService,
    LessonTranscriptService,
    LessonQuizService,
    AudioExtractorService,
  ],
  exports: [
    CourseRepository,
    SectionRepository,
    LessonRepository,
    CourseMindmapRepository,
    LessonTranscriptRepository,
    LessonQuizRepository,
    LessonMindmapRepository,
    LessonSummaryRepository,
    LessonQuizDraftRepository,
    CourseService,
    LessonService,
    CourseMindmapService,
    LessonTranscriptService,
    LessonQuizService,
    AudioExtractorService,
  ],
})
export class CourseModule {}
