import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseEntity, CourseSchema } from '../course/schemas/course.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../enrollment/schemas/enrollment.schema.js';
import { OrderEntity, OrderSchema } from '../enrollment/schemas/order.schema.js';
import { LearningProgressModule } from '../learning-progress/learning-progress.module.js';
import { UserModule } from '../user/user.module.js';
import { AdminUserCoursesController } from './admin-user-courses.controller.js';
import { AdminUserCoursesRepository } from './repositories/admin-user-courses.repository.js';
import { AdminUserCoursesService } from './services/admin-user-courses.service.js';

@Module({
  imports: [
    UserModule,
    LearningProgressModule,
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
      { name: EnrollmentEntity.name, schema: EnrollmentSchema },
      { name: OrderEntity.name, schema: OrderSchema },
    ]),
  ],
  controllers: [AdminUserCoursesController],
  providers: [AdminUserCoursesRepository, AdminUserCoursesService],
})
export class AdminUsersModule {}
