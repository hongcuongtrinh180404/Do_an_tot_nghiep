import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { createHmac } from 'node:crypto';
import {
  OrderStatusEnum, ReconciliationStatusEnum, CourseStatusEnum, CourseLevelEnum,
  UserStatusEnum, RoleEnum, type IOrder, type ICourse, type IPayment, type IPaymentAuditEntry,
} from 'share-lib';
import { PaymentService } from '../services/payment.service.js';
import { SepayService } from '../services/sepay.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto.js';

const SECRET = 'payment-unit-test-secret-at-least-32-characters';
const CODE = 'MD7K2P9X4A6B';
const USER = '000000000000000000000001';
const COURSE = '000000000000000000000002';
const ORDER = '000000000000000000000003';
const SESSION = {} as ClientSession;

describe('PaymentService', () => {
  let service: PaymentService;
  let order: IOrder;
  let course: ICourse;
  let receipts: Map<string, IPayment>;
  let enrolled: boolean;
  let payments: ReturnType<typeof paymentMocks>;
  let orders: ReturnType<typeof orderMocks>;
  let enrollments: { findByUserAndCourse: ReturnType<typeof vi.fn>; hasRevokedEnrollment: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let courses: { findById: ReturnType<typeof vi.fn>; findForEnrollment: ReturnType<typeof vi.fn> };

  function paymentMocks() {
    return {
      runTransaction: vi.fn(async (operation: (session: ClientSession) => Promise<unknown>) => operation(SESSION)),
      findBySepayTransactionId: vi.fn(async (id: string) => [...receipts.values()].find((item) => item.sepayTransactionId === id) ?? null),
      findById: vi.fn(async (id: string) => receipts.get(id) ?? null),
      create: vi.fn(async (fields: Partial<IPayment>) => {
        const saved = { id: String(receipts.size + 1), ...fields, createdAt: new Date(), updatedAt: new Date() } as IPayment;
        receipts.set(saved.id, saved);
        return saved;
      }),
      updateReconciliation: vi.fn(async (id: string, fields: Partial<IPayment>, _session: ClientSession, audit?: IPaymentAuditEntry) => {
        const saved = { ...receipts.get(id)!, ...fields };
        if (audit) saved.auditHistory = [...saved.auditHistory ?? [], audit];
        receipts.set(id, saved);
        return saved;
      }),
      getEligibleReceipts: vi.fn(async (orderId: string) => [...receipts.values()].filter((item) => item.orderId === orderId && [ReconciliationStatusEnum.UNDERPAID, ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID].includes(item.reconciliationStatus))),
      markReceiptsApplied: vi.fn(async (ids: string[], at: Date) => {
        for (const id of ids) Object.assign(receipts.get(id)!, { appliedAt: at, reconciliationStatus: ReconciliationStatusEnum.MATCHED });
      }),
      findReconciliationQueue: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
  }

  function orderMocks() {
    return {
      create: vi.fn(async (data: Partial<IOrder>) => ({ ...order, ...data })),
      findByOrderCode: vi.fn(async () => ({ ...order })),
      findStatusByOrderCode: vi.fn(async (): Promise<IOrder | null> => ({ ...order })),
      findPendingOrderByUserAndCourse: vi.fn().mockResolvedValue(null),
      expirePendingOrders: vi.fn().mockResolvedValue(undefined),
      expirePendingOrder: vi.fn(async (): Promise<IOrder | null> => ({ ...order, status: OrderStatusEnum.EXPIRED })),
      lockForPaymentProcessing: vi.fn(async () => ({ ...order })),
      recordReceipt: vi.fn(async (_id: string, status: ReconciliationStatusEnum, _session: ClientSession, amount?: number) => {
        order.lastPaymentStatus = status;
        if (amount !== undefined) order.receivedAmount = amount;
      }),
      markPaid: vi.fn(async (_id: string, paidAt: Date, receivedAmount: number) => {
        Object.assign(order, { status: OrderStatusEnum.PAID, paidAt, receivedAmount });
        return { ...order };
      }),
      cancelOtherPendingOrders: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    receipts = new Map(); enrolled = false;
    order = {
      id: ORDER, orderCode: CODE, userId: USER, courseId: COURSE, amount: 499000,
      originalPrice: 799000, discountAmount: 300000, paymentMethod: 'SEPAY_BANK_TRANSFER',
      status: OrderStatusEnum.PENDING, expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(Date.now() - 60000), updatedAt: new Date(),
      courseSnapshot: { title: 'Checkout snapshot', slug: 'checkout-snapshot' },
    };
    course = {
      id: COURSE, title: 'Course', slug: 'course', price: 499000, originalPrice: 799000,
      instructorId: 'teacher', status: CourseStatusEnum.PUBLISHED, level: CourseLevelEnum.ALL_LEVELS,
      createdAt: new Date(), updatedAt: new Date(),
    };
    payments = paymentMocks(); orders = orderMocks();
    enrollments = {
      findByUserAndCourse: vi.fn(async () => enrolled ? { id: 'enrollment' } : null),
      hasRevokedEnrollment: vi.fn().mockResolvedValue(false),
      create: vi.fn(async () => { enrolled = true; return { id: 'enrollment' }; }),
    };
    courses = { findById: vi.fn().mockResolvedValue(course), findForEnrollment: vi.fn().mockResolvedValue(course) };
    const sepay = new SepayService(new ConfigService({
      SEPAY_BANK_ACCOUNT: '0333338888', SEPAY_BANK_CODE: 'MB', SEPAY_ACCOUNT_NAME: 'TEST ACCOUNT',
      SEPAY_WEBHOOK_SECRET: SECRET, SEPAY_PAYMENT_EXPIRE_MINUTES: 15,
    }));
    service = new PaymentService(
      payments as unknown as PaymentRepository, orders as unknown as OrderRepository,
      enrollments as unknown as EnrollmentRepository, courses as unknown as CourseRepository,
      { findById: vi.fn().mockResolvedValue({ id: USER, status: UserStatusEnum.ACTIVE }) } as unknown as UserRepository,
      sepay, { get: vi.fn() } as unknown as ClsService,
    );
  });

  function webhook(fields: Partial<SepayWebhookDto> = {}) {
    const payload: SepayWebhookDto = {
      id: 123, gateway: 'MBBank', transactionDate: new Date().toISOString(), accountNumber: '0333338888',
      code: CODE, content: `${CODE} hoc phi`, transferType: 'in', transferAmount: 499000, ...fields,
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', SECRET).update(`${timestamp}.`).update(raw).digest('hex');
    return service.processSepayWebhook({ 'x-sepay-signature': `sha256=${signature}`, 'x-sepay-timestamp': timestamp }, raw, payload);
  }

  it('creates a server-priced order with snapshots and a unique pending key', async () => {
    const result = await service.createOrder(USER, COURSE);
    expect(result.order.orderCode).toMatch(/^MD[A-Z0-9]{10}$/);
    expect(result.order.amount).toBe(499000);
    expect(orders.create).toHaveBeenCalledWith(expect.objectContaining({ pendingCheckoutKey: `${USER}:${COURSE}`, discountAmount: 300000, bankSnapshot: expect.any(Object), courseSnapshot: expect.any(Object) }));
  });

  it('reuses an existing checkout and its price snapshot', async () => {
    orders.findPendingOrderByUserAndCourse.mockResolvedValue(order);
    course.price = 600000;
    expect((await service.createOrder(USER, COURSE)).order.amount).toBe(499000);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('retries an INSERT collision instead of relying on a pre-insert code lookup', async () => {
    orders.create.mockRejectedValueOnce({ code: 11000 });
    await service.createOrder(USER, COURSE);
    expect(orders.create).toHaveBeenCalledTimes(2);
  });

  it('returns the winning checkout after a concurrent pending-key collision', async () => {
    orders.findPendingOrderByUserAndCourse.mockResolvedValueOnce(null).mockResolvedValueOnce(order);
    orders.create.mockRejectedValueOnce({ code: 11000 });
    expect((await service.createOrder(USER, COURSE)).order.orderCode).toBe(CODE);
    expect(orders.create).toHaveBeenCalledTimes(1);
  });

  it('rejects free courses, invalid prices, and already owned courses', async () => {
    course.price = 0;
    await expect(service.createOrder(USER, COURSE)).rejects.toThrow(BadRequestException);
    course.price = 1.5;
    await expect(service.createOrder(USER, COURSE)).rejects.toThrow(BadRequestException);
    course.price = 499000; enrolled = true;
    await expect(service.createOrder(USER, COURSE)).rejects.toThrow(ConflictException);
  });

  it('returns a lightweight status without loading course/bank details', async () => {
    const result = await service.getOrderStatus(USER, RoleEnum.STUDENT, CODE);
    expect(result.status).toBe(OrderStatusEnum.PENDING);
    expect(result).not.toHaveProperty('course');
    expect(result).not.toHaveProperty('paymentInfo');
    expect(courses.findById).not.toHaveBeenCalled();
  });

  it('checks ownership and allows administrators to read an order', async () => {
    await expect(service.getOrderStatus('other', RoleEnum.STUDENT, CODE)).rejects.toThrow(ForbiddenException);
    expect((await service.getOrderStatus('admin', RoleEnum.ADMIN, CODE)).orderCode).toBe(CODE);
    orders.findStatusByOrderCode.mockResolvedValueOnce(null);
    await expect(service.getOrderStatus(USER, RoleEnum.STUDENT, CODE)).rejects.toThrow(NotFoundException);
  });

  it('does not report EXPIRED if a concurrent payment won the conditional expiry update', async () => {
    order.expiresAt = new Date(Date.now() - 1000);
    orders.expirePendingOrder.mockImplementationOnce(async () => { order.status = OrderStatusEnum.PAID; return null; });
    expect((await service.getOrderStatus(USER, RoleEnum.STUDENT, CODE)).status).toBe(OrderStatusEnum.PAID);
  });

  it('loads checkout details from snapshots and uses the remaining amount for VietQR', async () => {
    order.receivedAmount = 200000;
    const result = await service.getCheckoutOrder(USER, RoleEnum.STUDENT, CODE);
    expect(result.course?.title).toBe('Checkout snapshot');
    expect(result.paymentInfo?.amount).toBe(299000);
    expect(courses.findById).not.toHaveBeenCalled();
  });

  it('activates a valid signed payment atomically and ignores a replay', async () => {
    expect((await webhook()).reconciliationStatus).toBe(ReconciliationStatusEnum.MATCHED);
    expect(order.status).toBe(OrderStatusEnum.PAID);
    expect(enrollments.create).toHaveBeenCalledTimes(1);
    expect((await webhook()).reconciliationStatus).toBe(ReconciliationStatusEnum.MATCHED);
    expect(enrollments.create).toHaveBeenCalledTimes(1);
    expect(receipts.size).toBe(1);
    expect([...receipts.values()][0].appliedAt).toBeInstanceOf(Date);
  });

  it('rejects a modified receipt with the same transaction ID', async () => {
    await webhook();
    await expect(webhook({ transferAmount: 600000 })).rejects.toThrow(ConflictException);
  });

  it('accumulates distinct partial transfers without spending a replay twice', async () => {
    expect((await webhook({ transferAmount: 200000 })).reconciliationStatus).toBe(ReconciliationStatusEnum.UNDERPAID);
    await webhook({ transferAmount: 200000 });
    expect(order.receivedAmount).toBe(200000);
    expect(enrollments.create).not.toHaveBeenCalled();
    expect((await webhook({ id: 124, transferAmount: 299000 })).reconciliationStatus).toBe(ReconciliationStatusEnum.MATCHED);
    expect(order.receivedAmount).toBe(499000);
    expect([...receipts.values()].every((item) => item.appliedAt)).toBe(true);
  });

  it('flags excess money and a separate second payment correctly', async () => {
    expect((await webhook({ transferAmount: 550000 })).reconciliationStatus).toBe(ReconciliationStatusEnum.OVERPAID);
    expect([...receipts.values()][0].excessAmount).toBe(51000);
    expect((await webhook({ id: 124 })).reconciliationStatus).toBe(ReconciliationStatusEnum.DUPLICATE_PAYMENT);
    expect(enrollments.create).toHaveBeenCalledTimes(1);
  });

  it('never activates a cancelled order or an invalid receiving account', async () => {
    order.status = OrderStatusEnum.CANCELLED;
    expect((await webhook()).reconciliationStatus).toBe(ReconciliationStatusEnum.CANCELLED_ORDER);
    order.status = OrderStatusEnum.PENDING;
    expect((await webhook({ id: 124, accountNumber: '999999' })).reconciliationStatus).toBe(ReconciliationStatusEnum.INVALID_ACCOUNT);
    expect(enrollments.create).not.toHaveBeenCalled();
  });

  it('accepts a bank transfer before the deadline even when delivery arrives after EXPIRED', async () => {
    order.status = OrderStatusEnum.EXPIRED;
    order.expiresAt = new Date(Date.now() - 10000);
    expect((await webhook({ transactionDate: new Date(Date.now() - 20000).toISOString() })).reconciliationStatus).toBe(ReconciliationStatusEnum.MATCHED);
    expect(enrollments.create).toHaveBeenCalledTimes(1);
  });

  it('flags actual late transfers and invalid dates for review instead of granting access', async () => {
    order.expiresAt = new Date(Date.now() - 1000);
    expect((await webhook()).reconciliationStatus).toBe(ReconciliationStatusEnum.EXPIRED_ORDER);
    expect((await webhook({ id: 124, transactionDate: '2026-02-30 12:00:00' })).reconciliationStatus).toBe(ReconciliationStatusEnum.INVALID_TRANSACTION_DATE);
    expect(enrollments.create).not.toHaveBeenCalled();
  });

  it('persists unmatched memos and ignores outgoing transfers', async () => {
    expect((await webhook({ code: null, content: 'hoc phi' })).reconciliationStatus).toBe(ReconciliationStatusEnum.UNMATCHED_ORDER);
    expect(receipts.size).toBe(1);
    await webhook({ id: 124, transferType: 'out' });
    expect(receipts.size).toBe(1);
  });

  it('does not ACK persistence failures or fall back to non-transactional writes', async () => {
    payments.create.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(webhook({ code: null, content: 'unknown' })).rejects.toThrow('Database unavailable');
    payments.runTransaction.mockRejectedValueOnce(new Error('Transaction numbers are only allowed on a replica set'));
    const before = payments.create.mock.calls.length;
    await expect(webhook()).rejects.toThrow('replica set');
    expect(payments.create.mock.calls.length).toBe(before);
  });

  it('does not ACK a failed enrollment write', async () => {
    enrollments.create.mockRejectedValueOnce(new Error('Enrollment write failed'));
    await expect(webhook()).rejects.toThrow('Enrollment write failed');
  });

  it('retries a concurrent receipt unique-key collision with a fresh transaction', async () => {
    payments.runTransaction.mockRejectedValueOnce({ code: 11000 });
    await webhook();
    expect(payments.runTransaction).toHaveBeenCalledTimes(2);
    expect(enrollments.create).toHaveBeenCalledTimes(1);
  });

  it('reprocesses a verified unmatched receipt with an auditable order mapping, not a synthetic payment', async () => {
    await webhook({ code: null, content: 'hoc phi' });
    await service.reprocessPayment('1', 'admin', { orderCode: CODE, note: 'Đã đối chiếu giao dịch ngân hàng' });
    expect(receipts.size).toBe(1);
    expect(receipts.get('1')?.auditHistory?.[0].actorId).toBe('admin');
    expect(order.status).toBe(OrderStatusEnum.PAID);
  });

  it('refuses to reprocess old unverified records or refund money already used for tuition', async () => {
    await webhook();
    const receipt = receipts.get('1')!;
    receipt.verifiedAt = undefined;
    await expect(service.reprocessPayment('1', 'admin', { note: 'Kiểm tra lại giao dịch' })).rejects.toThrow(ConflictException);
    await expect(service.resolvePayment('1', 'admin', { type: 'REFUNDED', note: 'Hoàn lại giao dịch', bankReference: 'FT123', refundedAmount: 499000 })).rejects.toThrow(BadRequestException);
  });

  it('records external refunds only for the excess amount and never marks an order paid', async () => {
    await webhook({ transferAmount: 550000 });
    const resolved = await service.resolvePayment('1', 'admin', { type: 'REFUNDED', note: 'Đã hoàn phần tiền thừa', bankReference: 'FT123', refundedAmount: 51000 });
    expect(resolved.resolution?.refundedAmount).toBe(51000);
    expect(enrollments.create).toHaveBeenCalledTimes(1);
  });
});
