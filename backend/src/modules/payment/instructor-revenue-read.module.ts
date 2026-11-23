import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderEntity, OrderSchema } from '../enrollment/schemas/order.schema.js';
import { InstructorRevenueReadRepository } from './repositories/instructor-revenue-read.repository.js';

/** No checkout, SePay, reconciliation, seeds or financial writes in this dependency graph. */
@Module({
  imports: [MongooseModule.forFeature([{ name: OrderEntity.name, schema: OrderSchema }])],
  providers: [InstructorRevenueReadRepository],
  exports: [InstructorRevenueReadRepository],
})
export class InstructorRevenueReadModule {}
