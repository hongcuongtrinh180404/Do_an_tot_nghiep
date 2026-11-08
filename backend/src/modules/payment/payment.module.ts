import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentEntity, PaymentSchema } from './schemas/payment.schema.js';
import { PaymentRepository } from './repositories/payment.repository.js';
import { SepayService } from './services/sepay.service.js';
import { PaymentService } from './services/payment.service.js';
import { PaymentController } from './payment.controller.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { CourseModule } from '../course/course.module.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentEntity.name, schema: PaymentSchema },
    ]),
    EnrollmentModule,
    UserModule,
    forwardRef(() => CourseModule),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentRepository,
    SepayService,
    PaymentService,
  ],
  exports: [
    PaymentRepository,
    SepayService,
    PaymentService,
  ],
})
export class PaymentModule {}

