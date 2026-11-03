import { OrderStatusEnum } from '../enums/order-status.enum.js';

export interface IOrder {
  id: string;
  orderCode: string;
  userId: string;
  courseId: string;
  amount: number;
  status: OrderStatusEnum;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

