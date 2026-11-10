import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModule } from '../course/course.module.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { UserModule } from '../user/user.module.js';
import { ReviewEntity, ReviewSchema } from './schemas/review.schema.js';
import { ReviewRepository } from './repositories/review.repository.js';
import { ReviewService } from './services/review.service.js';
import { ReviewController } from './review.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewEntity.name, schema: ReviewSchema },
    ]),
    CourseModule,
    EnrollmentModule,
    LearningProgressModule,
    UserModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewRepository, ReviewService],
  exports: [ReviewRepository, ReviewService],
})
export class ReviewModule {}

