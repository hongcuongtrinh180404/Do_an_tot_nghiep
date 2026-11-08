import { OrderStatusEnum } from '../enums/order-status.enum.js';

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
  status: OrderStatusEnum;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
