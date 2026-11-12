import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentEntity, PaymentSchema } from './schemas/payment.schema.js';
import {
  CommissionSettingEntity,
  CommissionSettingSchema,
} from './schemas/commission-setting.schema.js';
import {
  CommissionHistoryEntity,
  CommissionHistorySchema,
} from './schemas/commission-history.schema.js';
import { PaymentRepository } from './repositories/payment.repository.js';
import { CommissionSettingRepository } from './repositories/commission-setting.repository.js';
import { CommissionHistoryRepository } from './repositories/commission-history.repository.js';
import { SepayService } from './services/sepay.service.js';
import { PaymentService } from './services/payment.service.js';
import { RevenueService } from './services/revenue.service.js';
import { PaymentController } from './payment.controller.js';
import { RevenueController } from './revenue.controller.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { CourseModule } from '../course/course.module.js';
import { UserModule } from '../user/user.module.js';
import { PaymentReadinessService } from './services/payment-readiness.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentEntity.name, schema: PaymentSchema },
      { name: CommissionSettingEntity.name, schema: CommissionSettingSchema },
      { name: CommissionHistoryEntity.name, schema: CommissionHistorySchema },
    ]),
    EnrollmentModule,
    UserModule,
    forwardRef(() => CourseModule),
  ],
  controllers: [PaymentController, RevenueController],
  providers: [
    PaymentRepository,
    CommissionSettingRepository,
    CommissionHistoryRepository,
    SepayService,
    PaymentService,
    RevenueService,
    PaymentReadinessService,
  ],
  exports: [
    PaymentRepository,
    CommissionSettingRepository,
    CommissionHistoryRepository,
    SepayService,
    PaymentService,
    RevenueService,
  ],
})
export class PaymentModule {}
