import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentEntity, EnrollmentSchema } from './schemas/enrollment.schema.js';
import { OrderEntity, OrderSchema } from './schemas/order.schema.js';
import { EnrollmentRepository } from './repositories/enrollment.repository.js';
import { OrderRepository } from './repositories/order.repository.js';
import { EnrollmentService } from './services/enrollment.service.js';
import { EnrollmentController } from './enrollment.controller.js';
import { UserModule } from '../user/user.module.js';
import { CourseModule } from '../course/course.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnrollmentEntity.name, schema: EnrollmentSchema },
      { name: OrderEntity.name, schema: OrderSchema },
    ]),
    UserModule,
    forwardRef(() => CourseModule),
  ],
  controllers: [EnrollmentController],
  providers: [
    EnrollmentRepository,
    OrderRepository,
    EnrollmentService,
  ],
  exports: [
    EnrollmentRepository,
    OrderRepository,
    EnrollmentService,
  ],
})
export class EnrollmentModule {}

