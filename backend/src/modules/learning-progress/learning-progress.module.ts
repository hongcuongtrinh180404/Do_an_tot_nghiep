import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { LearningProgressEntity, LearningProgressSchema } from './schemas/learning-progress.schema.js';
import { LearningProgressRepository } from './repositories/learning-progress.repository.js';
import { LearningProgressService } from './services/learning-progress.service.js';
import { LearningProgressController } from './learning-progress.controller.js';

@Module({
  imports: [
    CourseModule,
    EnrollmentModule,
    MongooseModule.forFeature([{ name: LearningProgressEntity.name, schema: LearningProgressSchema }]),
  ],
  controllers: [LearningProgressController],
  providers: [LearningProgressRepository, LearningProgressService],
})
export class LearningProgressModule {}
