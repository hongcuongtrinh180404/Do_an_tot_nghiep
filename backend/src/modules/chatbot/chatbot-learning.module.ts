import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentEntity, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema.js';
import { LessonEntity, LessonSchema } from '../course/schemas/lesson.schema.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { ChatbotMyCoursesRepository } from './repositories/chatbot-my-courses.repository.js';
import { ChatbotLearningReadService } from './services/chatbot-learning-read.service.js';
import { GetMyCoursesTool } from './tools/get-my-courses.tool.js';
import { GetMyLearningProgressTool } from './tools/get-my-learning-progress.tool.js';

@Module({
  imports: [
    LearningProgressModule,
    MongooseModule.forFeature([
      { name: EnrollmentEntity.name, schema: EnrollmentSchema },
      { name: LessonEntity.name, schema: LessonSchema },
    ]),
  ],
  providers: [ChatbotMyCoursesRepository, ChatbotLearningReadService, GetMyCoursesTool, GetMyLearningProgressTool],
  exports: [GetMyCoursesTool, GetMyLearningProgressTool],
})
export class ChatbotLearningModule {}
