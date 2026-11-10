import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { LearningProgressEntity, LearningProgressSchema } from './schemas/learning-progress.schema.js';
import { LearningProgressRepository } from './repositories/learning-progress.repository.js';
import { LearningProgressService } from './services/learning-progress.service.js';
import { LearningProgressController } from './learning-progress.controller.js';
import { LessonCompletionController } from './lesson-completion.controller.js';
import { LessonCompletionService } from './services/lesson-completion.service.js';
import { LessonCompletionRepository } from './repositories/lesson-completion.repository.js';
import { LessonQuizAnswerEntity, LessonQuizAnswerSchema, LessonVideoCompletionEntity, LessonVideoCompletionSchema } from './schemas/lesson-completion.schema.js';

@Module({
  imports: [
    CourseModule,
    EnrollmentModule,
    MongooseModule.forFeature([
      { name: LearningProgressEntity.name, schema: LearningProgressSchema },
      { name: LessonQuizAnswerEntity.name, schema: LessonQuizAnswerSchema },
      { name: LessonVideoCompletionEntity.name, schema: LessonVideoCompletionSchema },
    ]),
  ],
  controllers: [LearningProgressController, LessonCompletionController],
  providers: [LearningProgressRepository, LearningProgressService, LessonCompletionRepository, LessonCompletionService],
  exports: [LearningProgressRepository, LearningProgressService],
})
export class LearningProgressModule {}
