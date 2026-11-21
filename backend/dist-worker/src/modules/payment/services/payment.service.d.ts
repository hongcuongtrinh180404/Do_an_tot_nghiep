import { ClsService } from 'nestjs-cls';
import { IPayment, ICreateOrderResponse, IOrderStatusResponse, ICheckoutOrderResponse, ReconciliationStatusEnum, RoleEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { CommissionSettingRepository } from '../repositories/commission-setting.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { SepayService } from './sepay.service.js';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto.js';
import { ReprocessPaymentDto, ResolvePaymentDto } from '../dto/reconciliation.dto.js';
export interface WebhookProcessResult {
    success: boolean;
    message: string;
    reconciliationStatus?: ReconciliationStatusEnum;
    orderCode?: string | null;
}
export declare class PaymentService extends BaseService<IPayment, string> {
    protected readonly paymentRepository: PaymentRepository;
    protected readonly orderRepository: OrderRepository;
    protected readonly enrollmentRepository: EnrollmentRepository;
    protected readonly courseRepository: CourseRepository;
    protected readonly userRepository: UserRepository;
    protected readonly sepayService: SepayService;
    protected readonly commissionSettingRepository?: CommissionSettingRepository | undefined;
    constructor(paymentRepository: PaymentRepository, orderRepository: OrderRepository, enrollmentRepository: EnrollmentRepository, courseRepository: CourseRepository, userRepository: UserRepository, sepayService: SepayService, cls: ClsService, commissionSettingRepository?: CommissionSettingRepository | undefined);
    createOrder(userId: string, courseId: string): Promise<ICreateOrderResponse>;
    private toCreateResponse;
    getOrderStatus(userId: string, userRole: RoleEnum, orderCode: string): Promise<IOrderStatusResponse>;
    getCheckoutOrder(userId: string, role: RoleEnum, orderCode: string): Promise<ICheckoutOrderResponse>;
    private requireOrderCode;
    private assertOwner;
    private toStatusResponse;
    processSepayWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string | undefined, payload: SepayWebhookDto): Promise<WebhookProcessResult>;
    private isTestDelivery;
    private validateTransfer;
    private assertSameReceipt;
    private withReceiptRetry;
    private reconcileReceipt;
    private receiptResult;
    getReconciliationQueue(page: number, limit: number): Promise<{
        page: number;
        limit: number;
        items: IPayment[];
        total: number;
    }>;
    reprocessPayment(paymentId: string, actorId: string, dto: ReprocessPaymentDto): Promise<WebhookProcessResult>;
    resolvePayment(paymentId: string, actorId: string, dto: ResolvePaymentDto): Promise<IPayment>;
}
