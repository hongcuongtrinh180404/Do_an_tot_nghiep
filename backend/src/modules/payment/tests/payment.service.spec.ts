import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  OrderStatusEnum,
  ReconciliationStatusEnum,
  CourseStatusEnum,
  UserStatusEnum,
  RoleEnum,
  IOrder,
  ICourse,
  IUser,
  IPayment,
} from 'share-lib';
import { PaymentService } from '../services/payment.service.js';
import { SepayService } from '../services/sepay.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto.js';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentRepository: Partial<PaymentRepository>;
  let mockOrderRepository: Partial<OrderRepository>;
  let mockEnrollmentRepository: Partial<EnrollmentRepository>;
  let mockCourseRepository: Partial<CourseRepository>;
  let mockUserRepository: Partial<UserRepository>;
  let mockSepayService: Partial<SepayService>;
  let mockConfigService: Partial<ConfigService>;
  let mockClsService: Partial<ClsService>;

  const mockUser: IUser = {
    id: 'user-1',
    email: 'student@example.com',
    username: 'student1',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    isEmailVerified: true,
    firstName: 'Van A',
    lastName: 'Nguyen',
    fullName: 'Nguyen Van A',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCourse: ICourse = {
    id: 'course-1',
    title: 'Khóa học Next.js Chuyên Sâu',
    slug: 'khoa-hoc-nextjs-chuyen-sau',
    price: 499000,
    originalPrice: 799000,
    instructorId: 'inst-1',
    status: CourseStatusEnum.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder: IOrder = {
    id: 'order-1',
    orderCode: 'MD12345',
    userId: 'user-1',
    courseId: 'course-1',
    amount: 499000,
    originalPrice: 799000,
    discountAmount: 300000,
    status: OrderStatusEnum.PENDING,
    paymentMethod: 'SEPAY_BANK_TRANSFER',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    paidAt: null,
    instructorCommissionRate: 0.7,
    instructorEarnings: 349300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPaymentRepository = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'payment-1', ...data })),
      findBySepayTransactionId: vi.fn().mockResolvedValue(null),
      findByOrderCode: vi.fn().mockResolvedValue([]),
    };

    mockOrderRepository = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'order-new', ...data })),
      findByOrderCode: vi.fn().mockResolvedValue(mockOrder),
      findPendingOrderByUserAndCourse: vi.fn().mockResolvedValue(null),
      updateOrderStatus: vi.fn().mockImplementation((id, status, extra) =>
        Promise.resolve({ ...mockOrder, id, status, ...extra }),
      ),
    };

    mockEnrollmentRepository = {
      findByUserAndCourse: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'enrollment-1', ...data })),
      withTransaction: vi.fn((cb: (session: ClientSession) => Promise<unknown>) =>
        cb({} as ClientSession),
      ),
    };

    mockCourseRepository = {
      findById: vi.fn().mockResolvedValue(mockCourse),
    };

    mockUserRepository = {
      findById: vi.fn().mockResolvedValue(mockUser),
    };

    mockSepayService = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      generateUniqueOrderCode: vi.fn().mockResolvedValue('MD12345'),
      generateVietQrUrl: vi.fn().mockReturnValue('https://qr.sepay.vn/img?test'),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'SEPAY_BANK_ACCOUNT') return '0333338888';
        if (key === 'SEPAY_BANK_CODE') return 'MB';
        if (key === 'SEPAY_ACCOUNT_NAME') return 'NGUYEN VAN A';
        if (key === 'SEPAY_PAYMENT_PREFIX') return 'MD';
        if (key === 'SEPAY_PAYMENT_EXPIRE_MINUTES') return 15;
        return defaultValue;
      }),
    };

    mockClsService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new PaymentService(
      mockPaymentRepository as PaymentRepository,
      mockOrderRepository as OrderRepository,
      mockEnrollmentRepository as EnrollmentRepository,
      mockCourseRepository as CourseRepository,
      mockUserRepository as UserRepository,
      mockSepayService as SepayService,
      mockConfigService as ConfigService,
      mockClsService as ClsService,
    );
  });

  describe('createOrder', () => {
    it('should create new order when no active pending order exists', async () => {
      const result = await service.createOrder('user-1', 'course-1');

      expect(mockOrderRepository.create).toHaveBeenCalled();
      expect(result.order.orderCode).toBe('MD12345');
      expect(result.order.amount).toBe(499000);
      expect(result.paymentInfo.qrUrl).toBeDefined();
    });

    it('should reuse active unexpired PENDING order if user clicks again (Choice 3-A)', async () => {
      mockOrderRepository.findPendingOrderByUserAndCourse = vi
        .fn()
        .mockResolvedValue(mockOrder);

      const result = await service.createOrder('user-1', 'course-1');

      expect(mockOrderRepository.create).not.toHaveBeenCalled();
      expect(result.order.orderCode).toBe(mockOrder.orderCode);
      expect(result.order.id).toBe(mockOrder.id);
    });

    it('should throw ConflictException if user is the instructor of course', async () => {
      mockCourseRepository.findById = vi.fn().mockResolvedValue({
        ...mockCourse,
        instructorId: 'user-1',
      });

      await expect(service.createOrder('user-1', 'course-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if user already owns the course', async () => {
      mockEnrollmentRepository.findByUserAndCourse = vi.fn().mockResolvedValue({
        id: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
      });

      await expect(service.createOrder('user-1', 'course-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if course is free (0 VND)', async () => {
      mockCourseRepository.findById = vi.fn().mockResolvedValue({
        ...mockCourse,
        price: 0,
      });

      await expect(service.createOrder('user-1', 'course-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrderStatus', () => {
    it('should return order status for order owner', async () => {
      const res = await service.getOrderStatus('user-1', RoleEnum.STUDENT, 'MD12345');
      expect(res.orderCode).toBe('MD12345');
      expect(res.status).toBe(OrderStatusEnum.PENDING);
      expect(res.isPaid).toBe(false);
    });

    it('should throw ForbiddenException if student tries to view another user order', async () => {
      await expect(
        service.getOrderStatus('user-other', RoleEnum.STUDENT, 'MD12345'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view another user order', async () => {
      const res = await service.getOrderStatus('admin-user', RoleEnum.ADMIN, 'MD12345');
      expect(res.orderCode).toBe('MD12345');
    });

    it('should automatically mark order as EXPIRED if pending and expiresAt has passed', async () => {
      mockOrderRepository.findByOrderCode = vi.fn().mockResolvedValue({
        ...mockOrder,
        expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
      });

      const res = await service.getOrderStatus('user-1', RoleEnum.STUDENT, 'MD12345');
      expect(res.status).toBe(OrderStatusEnum.EXPIRED);
      expect(res.isExpired).toBe(true);
      expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatusEnum.EXPIRED,
      );
    });
  });

  describe('processSepayWebhook', () => {
    const validPayload: SepayWebhookDto = {
      id: 998877,
      gateway: 'MBBank',
      transactionDate: '2026-11-08 15:30:00',
      accountNumber: '0333338888',
      code: 'MD12345',
      content: 'MD12345 chuyen tien hoc',
      transferType: 'in',
      transferAmount: 499000,
    };

    it('should verify HMAC signature first', async () => {
      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(validPayload));

      await service.processSepayWebhook(headers, rawBody, validPayload);
      expect(mockSepayService.verifyWebhookSignature).toHaveBeenCalledWith(headers, rawBody);
    });

    it('should successfully activate order and create enrollment on exact payment', async () => {
      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(validPayload));

      const res = await service.processSepayWebhook(headers, rawBody, validPayload);

      expect(res.success).toBe(true);
      expect(res.reconciliationStatus).toBe(ReconciliationStatusEnum.MATCHED);
      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderCode: mockOrder.orderCode,
          content: validPayload.content,
        }),
        expect.anything(),
      );
      expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatusEnum.PAID,
        expect.objectContaining({ paidAt: expect.any(Date) }),
        expect.anything(),
      );
      expect(mockEnrollmentRepository.create).toHaveBeenCalled();
    });

    it('should save reconciliation with a null order code when the transfer has no order code', async () => {
      const unmatchedPayload: SepayWebhookDto = {
        ...validPayload,
        code: undefined,
        content: 'chuyen tien hoc',
      };
      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(unmatchedPayload));

      const res = await service.processSepayWebhook(headers, rawBody, unmatchedPayload);

      const expectedPayment: Partial<IPayment> = {
        orderId: null,
        orderCode: null,
        content: unmatchedPayload.content,
        reconciliationStatus: ReconciliationStatusEnum.UNMATCHED_ORDER,
      };
      expect(res.success).toBe(true);
      expect(res.reconciliationStatus).toBe(ReconciliationStatusEnum.UNMATCHED_ORDER);
      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(expectedPayment),
      );
      expect(mockOrderRepository.findByOrderCode).not.toHaveBeenCalled();
      expect(mockOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
      expect(mockEnrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('should be idempotent and not duplicate enrollment when webhook is resent', async () => {
      mockPaymentRepository.findBySepayTransactionId = vi.fn().mockResolvedValue({
        id: 'payment-existing',
        sepayTransactionId: '998877',
        reconciliationStatus: ReconciliationStatusEnum.MATCHED,
        orderCode: 'MD12345',
      });

      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(validPayload));

      const res = await service.processSepayWebhook(headers, rawBody, validPayload);

      expect(res.success).toBe(true);
      expect(res.message).toContain('đã được ghi nhận');
      expect(mockOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
      expect(mockEnrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('should handle overpaid payment by activating course and flagging OVERPAID (Choice 2-A)', async () => {
      const overpaidPayload: SepayWebhookDto = {
        ...validPayload,
        transferAmount: 550000, // course is 499000
      };

      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(overpaidPayload));

      const res = await service.processSepayWebhook(headers, rawBody, overpaidPayload);

      expect(res.success).toBe(true);
      expect(res.reconciliationStatus).toBe(ReconciliationStatusEnum.OVERPAID);
      expect(mockEnrollmentRepository.create).toHaveBeenCalled();
    });

    it('should flag UNDERPAID and not activate enrollment when transfer amount is less than order amount', async () => {
      const underpaidPayload: SepayWebhookDto = {
        ...validPayload,
        transferAmount: 200000, // course is 499000
      };

      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(underpaidPayload));

      const res = await service.processSepayWebhook(headers, rawBody, underpaidPayload);

      expect(res.success).toBe(true);
      expect(res.reconciliationStatus).toBe(ReconciliationStatusEnum.UNDERPAID);
      expect(mockOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
      expect(mockEnrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('should ignore transferType=out without modifying orders', async () => {
      const moneyOutPayload: SepayWebhookDto = {
        ...validPayload,
        transferType: 'out',
      };

      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(moneyOutPayload));

      const res = await service.processSepayWebhook(headers, rawBody, moneyOutPayload);

      expect(res.success).toBe(true);
      expect(res.message).toContain('tiền ra');
      expect(mockOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should flag INVALID_ACCOUNT when receiving bank account does not match config', async () => {
      const wrongAccountPayload: SepayWebhookDto = {
        ...validPayload,
        accountNumber: '9999999999', // config is 0333338888
      };

      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(wrongAccountPayload));

      const res = await service.processSepayWebhook(headers, rawBody, wrongAccountPayload);

      expect(res.reconciliationStatus).toBe(ReconciliationStatusEnum.INVALID_ACCOUNT);
      expect(mockEnrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('should flag EXPIRED_ORDER when payment is received for an expired order', async () => {
      mockOrderRepository.findByOrderCode = vi.fn().mockResolvedValue({
        ...mockOrder,
        status: OrderStatusEnum.EXPIRED,
      });

      const headers = { 'x-sepay-signature': 'sha256=test', 'x-sepay-timestamp': '123' };
      const rawBody = Buffer.from(JSON.stringify(validPayload));

      const res = await service.processSepayWebhook(headers, rawBody, validPayload);

      expect(res.reconciliationStatus).toBe(ReconciliationStatusEnum.EXPIRED_ORDER);
      expect(mockEnrollmentRepository.create).not.toHaveBeenCalled();
    });
  });
});
