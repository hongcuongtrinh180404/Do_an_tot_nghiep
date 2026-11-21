var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { SepayService } from './sepay.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
let PaymentReadinessService = class PaymentReadinessService {
    connection;
    config;
    sepay;
    payments;
    orders;
    enrollments;
    constructor(connection, config, sepay, payments, orders, enrollments) {
        this.connection = connection;
        this.config = config;
        this.sepay = sepay;
        this.payments = payments;
        this.orders = orders;
        this.enrollments = enrollments;
    }
    async onModuleInit() {
        const configured = ['SEPAY_BANK_ACCOUNT', 'SEPAY_BANK_CODE', 'SEPAY_ACCOUNT_NAME', 'SEPAY_WEBHOOK_SECRET']
            .some((key) => Boolean(this.config.get(key, '').trim()));
        if (!configured && this.config.get('NODE_ENV') !== 'production')
            return;
        this.sepay.getPaymentConfiguration();
        const hello = await this.connection.db?.admin().command({ hello: 1 });
        if (!hello || (!hello.setName && hello.msg !== 'isdbgrid')) {
            throw new Error('Thanh toán SePay yêu cầu MongoDB replica set hoặc sharded cluster; không hỗ trợ fallback standalone');
        }
        await Promise.all([this.payments.ensureIndexes(), this.orders.ensureIndexes(), this.enrollments.ensureIndexes()]);
    }
};
PaymentReadinessService = __decorate([
    Injectable(),
    __param(0, InjectConnection()),
    __metadata("design:paramtypes", [Function, ConfigService,
        SepayService,
        PaymentRepository,
        OrderRepository,
        EnrollmentRepository])
], PaymentReadinessService);
export { PaymentReadinessService };
//# sourceMappingURL=payment-readiness.service.js.map