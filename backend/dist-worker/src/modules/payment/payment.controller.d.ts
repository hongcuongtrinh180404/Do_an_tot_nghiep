import type { Request, Response } from 'express';
import { ApiResponse } from '../base/index.js';
import { ICreateOrderResponse, IOrderStatusResponse, ICheckoutOrderResponse, RoleEnum } from 'share-lib';
import { PaymentService, WebhookProcessResult } from './services/payment.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';
import { ReconciliationQueryDto, ReprocessPaymentDto, ResolvePaymentDto } from './dto/reconciliation.dto.js';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    createOrder(userId: string, dto: CreateOrderDto): Promise<ApiResponse<ICreateOrderResponse>>;
    getOrderStatus(userId: string, role: RoleEnum, orderCode: string): Promise<ApiResponse<IOrderStatusResponse>>;
    getCheckoutOrder(userId: string, role: RoleEnum, orderCode: string): Promise<ApiResponse<ICheckoutOrderResponse>>;
    getReconciliationQueue(query: ReconciliationQueryDto): Promise<ApiResponse<{
        page: number;
        limit: number;
        items: import("share-lib").IPayment[];
        total: number;
    }>>;
    getReconciliationPayment(paymentId: string): Promise<ApiResponse<import("share-lib").IPayment>>;
    reprocessPayment(paymentId: string, actorId: string, dto: ReprocessPaymentDto): Promise<ApiResponse<WebhookProcessResult>>;
    resolvePayment(paymentId: string, actorId: string, dto: ResolvePaymentDto): Promise<ApiResponse<import("share-lib").IPayment>>;
    handleSepayWebhook(headers: Record<string, string | string[] | undefined>, req: Request & {
        rawBody?: Buffer;
    }, payload: SepayWebhookDto, response: Response): Promise<void>;
    handleWebhookAlias(headers: Record<string, string | string[] | undefined>, req: Request & {
        rawBody?: Buffer;
    }, payload: SepayWebhookDto, response: Response): Promise<void>;
}
