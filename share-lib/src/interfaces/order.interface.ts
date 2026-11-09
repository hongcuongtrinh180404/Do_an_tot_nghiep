import { OrderStatusEnum } from '../enums/order-status.enum.js';
import { ReconciliationStatusEnum } from '../enums/reconciliation-status.enum.js';

export interface IOrderCourseSnapshot {
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  instructorName?: string;
}

export interface IOrderBankSnapshot {
  bankAccount: string;
  bankCode: string;
  accountName: string;
}

export interface IOrder {
  id: string;
  orderCode: string;
  userId: string;
  courseId: string;
  amount: number;
  originalPrice?: number;
  discountAmount?: number;
  paymentMethod?: string;
  expiresAt?: Date | string;
  paidAt?: Date | string | null;
  instructorCommissionRate?: number;
  instructorEarnings?: number;
  pendingCheckoutKey?: string;
  paymentRevision?: number;
  receivedAmount?: number;
  lastPaymentStatus?: ReconciliationStatusEnum;
  courseSnapshot?: IOrderCourseSnapshot;
  bankSnapshot?: IOrderBankSnapshot;
  status: OrderStatusEnum;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
