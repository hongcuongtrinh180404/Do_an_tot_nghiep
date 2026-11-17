import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module.js';
import { CourseModule } from '../course/course.module.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { CourseEntity, CourseSchema } from '../course/schemas/course.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema.js';
import { PublicProfileController } from './public-profile.controller.js';
import { PublicProfileService } from './public-profile.service.js';
import { PublicProfileRepository } from './public-profile.repository.js';

@Module({
  imports: [
    UserModule, CourseModule, LearningProgressModule,
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
      { name: EnrollmentEntity.name, schema: EnrollmentSchema },
    ]),
  ],
  controllers: [PublicProfileController],
  providers: [PublicProfileRepository, PublicProfileService],
})
export class PublicProfileModule {}
