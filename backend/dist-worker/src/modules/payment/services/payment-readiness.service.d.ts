import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';
import { SepayService } from './sepay.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
export declare class PaymentReadinessService implements OnModuleInit {
    private readonly connection;
    private readonly config;
    private readonly sepay;
    private readonly payments;
    private readonly orders;
    private readonly enrollments;
    constructor(connection: Connection, config: ConfigService, sepay: SepayService, payments: PaymentRepository, orders: OrderRepository, enrollments: EnrollmentRepository);
    onModuleInit(): Promise<void>;
}
