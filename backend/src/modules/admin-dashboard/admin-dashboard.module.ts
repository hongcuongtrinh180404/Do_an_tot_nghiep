import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  OrderEntity,
  OrderSchema,
} from '../enrollment/schemas/order.schema.js';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { AdminDashboardController } from './admin-dashboard.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderEntity.name, schema: OrderSchema },
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardRepository, AdminDashboardService],
  exports: [AdminDashboardService, AdminDashboardRepository],
})
export class AdminDashboardModule {}
