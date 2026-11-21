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
import { Controller, Get, Post, Body, Param, Headers, Req, HttpCode, HttpStatus, Query, Res, Header, } from '@nestjs/common';
import { ApiResponse, ParseObjectIdPipe, } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { RoleEnum, } from 'share-lib';
import { PaymentService } from './services/payment.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';
import { ReconciliationQueryDto, ReprocessPaymentDto, ResolvePaymentDto } from './dto/reconciliation.dto.js';
let PaymentController = class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async createOrder(userId, dto) {
        const result = await this.paymentService.createOrder(userId, dto.courseId);
        return ApiResponse.success(result, 'Khởi tạo đơn hàng thanh toán thành công');
    }
    async getOrderStatus(userId, role, orderCode) {
        const result = await this.paymentService.getOrderStatus(userId, role, orderCode);
        return ApiResponse.success(result, 'Lấy trạng thái đơn hàng thành công');
    }
    async getCheckoutOrder(userId, role, orderCode) {
        return ApiResponse.success(await this.paymentService.getCheckoutOrder(userId, role, orderCode));
    }
    async getReconciliationQueue(query) {
        return ApiResponse.success(await this.paymentService.getReconciliationQueue(query.page, query.limit));
    }
    async getReconciliationPayment(paymentId) {
        return ApiResponse.success(await this.paymentService.findByIdOrFail(paymentId));
    }
    async reprocessPayment(paymentId, actorId, dto) {
        return ApiResponse.success(await this.paymentService.reprocessPayment(paymentId, actorId, dto));
    }
    async resolvePayment(paymentId, actorId, dto) {
        return ApiResponse.success(await this.paymentService.resolvePayment(paymentId, actorId, dto));
    }
    async handleSepayWebhook(headers, req, payload, response) {
        await this.paymentService.processSepayWebhook(headers, req.rawBody, payload);
        response.status(HttpStatus.OK).json({ success: true });
    }
    async handleWebhookAlias(headers, req, payload, response) {
        await this.handleSepayWebhook(headers, req, payload, response);
    }
};
__decorate([
    Post('create-order'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateOrderDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createOrder", null);
__decorate([
    Get('order-status/:orderCode'),
    Header('Cache-Control', 'no-store'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, CurrentUser('role')),
    __param(2, Param('orderCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getOrderStatus", null);
__decorate([
    Get('orders/:orderCode'),
    Header('Cache-Control', 'no-store'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, CurrentUser('role')),
    __param(2, Param('orderCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getCheckoutOrder", null);
__decorate([
    Get('reconciliation'),
    Header('Cache-Control', 'no-store'),
    Roles(RoleEnum.ADMIN),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReconciliationQueryDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getReconciliationQueue", null);
__decorate([
    Get('reconciliation/:paymentId'),
    Header('Cache-Control', 'no-store'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('paymentId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getReconciliationPayment", null);
__decorate([
    Post('reconciliation/:paymentId/reprocess'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('paymentId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ReprocessPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "reprocessPayment", null);
__decorate([
    Post('reconciliation/:paymentId/resolve'),
    HttpCode(HttpStatus.OK),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('paymentId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ResolvePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "resolvePayment", null);
__decorate([
    Post('sepay/webhook'),
    Public(),
    HttpCode(HttpStatus.OK),
    __param(0, Headers()),
    __param(1, Req()),
    __param(2, Body()),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, SepayWebhookDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleSepayWebhook", null);
__decorate([
    Post('webhook'),
    Public(),
    HttpCode(HttpStatus.OK),
    __param(0, Headers()),
    __param(1, Req()),
    __param(2, Body()),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, SepayWebhookDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleWebhookAlias", null);
PaymentController = __decorate([
    Controller('payments'),
    __metadata("design:paramtypes", [PaymentService])
], PaymentController);
export { PaymentController };
//# sourceMappingURL=payment.controller.js.map