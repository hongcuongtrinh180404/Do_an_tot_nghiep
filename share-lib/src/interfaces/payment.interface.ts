import { ReconciliationStatusEnum } from '../enums/reconciliation-status.enum.js';
import { OrderStatusEnum } from '../enums/order-status.enum.js';
import { IOrderBankSnapshot, IOrderCourseSnapshot } from './order.interface.js';

export interface IPaymentAuditEntry {
  action: 'REPROCESS' | 'RESOLVE';
  actorId: string;
  note: string;
  at: Date | string;
  previousStatus: ReconciliationStatusEnum;
  previousOrderCode?: string | null;
}

export interface IPayment {
  id: string;
  orderId?: string | null;
  orderCode?: string | null;
  sepayTransactionId: string;
  amountIn: number;
  bankBrandName: string;
  accountNumber: string;
  transactionDate: Date | string | null;
  content: string;
  reconciliationStatus: ReconciliationStatusEnum;
  rawPayload?: Record<string, unknown>;
  appliedAt?: Date | string | null;
  verifiedAt?: Date | string;
  payloadHash?: string;
  excessAmount?: number;
  resolution?: {
    type: 'ACKNOWLEDGED' | 'REFUNDED';
    note: string;
    bankReference?: string;
    refundedAmount?: number;
    actorId: string;
    at: Date | string;
  } | null;
  auditHistory?: IPaymentAuditEntry[];
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface ICreateOrderResponse {
  order: {
    id: string;
    orderCode: string;
    amount: number;
    originalPrice: number;
    discountAmount: number;
    status: OrderStatusEnum;
    expiresAt: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl?: string | null;
    price: number;
    originalPrice?: number | null;
  };
  paymentInfo: {
    bankAccount: string;
    bankCode: string;
    accountName: string;
    amount: number;
    orderCode: string;
    qrUrl: string;
    expiresAt: string;
  };
}

export interface IOrderStatusResponse {
  orderCode: string;
  status: OrderStatusEnum;
  amount: number;
  courseId: string;
  isPaid: boolean;
  isExpired: boolean;
  expiresAt: string;
  paidAt?: string | null;
  serverTime: string;
  receivedAmount: number;
  reconciliationStatus?: ReconciliationStatusEnum;
}

export interface ICheckoutOrderResponse extends IOrderStatusResponse {
  originalPrice: number;
  discountAmount: number;
  course: (IOrderCourseSnapshot & { id: string }) | null;
  paymentInfo?: IOrderBankSnapshot & {
    amount: number;
    orderCode: string;
    qrUrl: string;
  };
}
