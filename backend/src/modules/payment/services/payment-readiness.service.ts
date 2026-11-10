import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { SepayService } from './sepay.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';

@Injectable()
export class PaymentReadinessService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly sepay: SepayService,
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly enrollments: EnrollmentRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const configured = ['SEPAY_BANK_ACCOUNT', 'SEPAY_BANK_CODE', 'SEPAY_ACCOUNT_NAME', 'SEPAY_WEBHOOK_SECRET']
      .some((key) => Boolean(this.config.get<string>(key, '').trim()));
    if (!configured && this.config.get<string>('NODE_ENV') !== 'production') return;

    this.sepay.getPaymentConfiguration();
    const hello = await this.connection.db?.admin().command({ hello: 1 });
    if (!hello || (!hello.setName && hello.msg !== 'isdbgrid')) {
      throw new Error('Thanh toán SePay yêu cầu MongoDB replica set hoặc sharded cluster; không hỗ trợ fallback standalone');
    }
    // Explicitly create financial uniqueness constraints even when autoIndex is disabled.
    // No syncIndexes/dropIndexes or historical data cleanup is performed.
    await Promise.all([this.payments.ensureIndexes(), this.orders.ensureIndexes(), this.enrollments.ensureIndexes()]);
  }
}
