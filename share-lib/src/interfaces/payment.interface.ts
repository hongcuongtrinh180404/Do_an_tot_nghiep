import { ReconciliationStatusEnum } from '../enums/reconciliation-status.enum.js';
import { OrderStatusEnum } from '../enums/order-status.enum.js';
import { ICourse } from './course.interface.js';

export interface IPayment {
  id: string;
  orderId?: string | null;
  orderCode?: string | null;
  sepayTransactionId: string;
  amountIn: number;
  bankBrandName: string;
  accountNumber: string;
  transactionDate: Date | string;
  content: string;
  reconciliationStatus: ReconciliationStatusEnum;
  rawPayload?: Record<string, unknown>;
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
  course?: ICourse | null;
  paymentInfo?: {
    bankAccount: string;
    bankCode: string;
    accountName: string;
    amount: number;
    orderCode: string;
    qrUrl: string;
  };
}
