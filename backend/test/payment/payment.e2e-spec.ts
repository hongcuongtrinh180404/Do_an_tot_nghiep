import 'reflect-metadata';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import mongoose, { type Model } from 'mongoose';
import request from 'supertest';
import {
  CourseStatusEnum, OrderStatusEnum, ReconciliationStatusEnum, RoleEnum, UserStatusEnum,
} from 'share-lib';
import { PaymentController } from '../../src/modules/payment/payment.controller.js';
import { PaymentService } from '../../src/modules/payment/services/payment.service.js';
import { PaymentReadinessService } from '../../src/modules/payment/services/payment-readiness.service.js';
import { SepayService } from '../../src/modules/payment/services/sepay.service.js';
import { PaymentRepository } from '../../src/modules/payment/repositories/payment.repository.js';
import { PaymentEntity, PaymentSchema } from '../../src/modules/payment/schemas/payment.schema.js';
import { SepayWebhookDto } from '../../src/modules/payment/dto/sepay-webhook.dto.js';
import { CreateOrderDto } from '../../src/modules/payment/dto/create-order.dto.js';
import { ReconciliationQueryDto, ReprocessPaymentDto, ResolvePaymentDto } from '../../src/modules/payment/dto/reconciliation.dto.js';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service.js';
import { EnrollmentController } from '../../src/modules/enrollment/enrollment.controller.js';
import { RegisterFreeCourseDto } from '../../src/modules/enrollment/dto/register-free-course.dto.js';
import { EnrollmentRepository } from '../../src/modules/enrollment/repositories/enrollment.repository.js';
import { OrderRepository } from '../../src/modules/enrollment/repositories/order.repository.js';
import { OrderEntity, OrderSchema } from '../../src/modules/enrollment/schemas/order.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../../src/modules/enrollment/schemas/enrollment.schema.js';
import { CourseRepository } from '../../src/modules/course/repositories/course.repository.js';
import { CourseEntity, CourseSchema } from '../../src/modules/course/schemas/course.schema.js';
import { CourseCategoryEntity, CourseCategorySchema } from '../../src/modules/course/schemas/course-category.schema.js';
import { UserRepository } from '../../src/modules/user/repositories/user.repository.js';
import { UserEntity, UserSchema } from '../../src/modules/user/schemas/user.schema.js';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard.js';
import { TransformInterceptor } from '../../src/modules/base/interceptors/transform.interceptor.js';

// Real schemas, indexes, repositories, transactions and HMAC. Fixtures exist only in this isolated DB.
// This is not a payment simulation endpoint and never touches the application's database or SePay Live.
describe('SePay payment integrity (MongoDB replica set + HTTP)', () => {
  const dbName = `mindly_payment_test_${randomUUID().replaceAll('-', '')}`;
  const secret = 'sepay-integration-test-secret-at-least-32-characters';
  const config = new ConfigService({
    SEPAY_BANK_ACCOUNT: '0333338888', SEPAY_BANK_CODE: 'MB', SEPAY_ACCOUNT_NAME: 'TEST ACCOUNT',
    SEPAY_WEBHOOK_SECRET: secret, SEPAY_PAYMENT_PREFIX: 'MD', SEPAY_PAYMENT_EXPIRE_MINUTES: 15,
  });
  const connection = mongoose.createConnection();
  let app: INestApplication;
  let users: Model<UserEntity>;
  let courses: Model<CourseEntity>;
  let orders: Model<OrderEntity>;
  let payments: Model<PaymentEntity>;
  let enrollments: Model<EnrollmentEntity>;
  let service: PaymentService;
  let freeService: EnrollmentService;
  let paymentRepository: PaymentRepository;
  let enrollmentRepository: EnrollmentRepository;
  let orderRepository: OrderRepository;
  let userId: string;
  let courseId: string;
  let sequence = 1;

  beforeAll(async () => {
    await connection.openUri(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
      dbName, serverSelectionTimeoutMS: 5000,
    });
    users = connection.model(UserEntity.name, UserSchema);
    courses = connection.model(CourseEntity.name, CourseSchema);
    connection.model(CourseCategoryEntity.name, CourseCategorySchema);
    orders = connection.model(OrderEntity.name, OrderSchema);
    payments = connection.model(PaymentEntity.name, PaymentSchema);
    enrollments = connection.model(EnrollmentEntity.name, EnrollmentSchema);
    await Promise.all([users.init(), courses.init(), orders.init(), payments.init(), enrollments.init()]);
    const cls = new ClsService(new AsyncLocalStorage());
    const courseRepository = new CourseRepository(courses);
    const userRepository = new UserRepository(users);
    orderRepository = new OrderRepository(orders);
    paymentRepository = new PaymentRepository(payments);
    enrollmentRepository = new EnrollmentRepository(enrollments);
    const sepay = new SepayService(config);
    service = new PaymentService(paymentRepository, orderRepository, enrollmentRepository, courseRepository, userRepository, sepay, cls);
    freeService = new EnrollmentService(enrollmentRepository, courseRepository, userRepository, cls);
    await new PaymentReadinessService(connection, config, sepay, paymentRepository, orderRepository, enrollmentRepository).onModuleInit();

    // Vite transpiles without TypeScript's emitDecoratorMetadata. Supply the same metadata as tsc.
    Reflect.defineMetadata('design:paramtypes', [PaymentService], PaymentController);
    Reflect.defineMetadata('design:paramtypes', [EnrollmentService], EnrollmentController);
    for (const method of ['handleSepayWebhook', 'handleWebhookAlias']) {
      Reflect.defineMetadata('design:paramtypes', [Object, Object, SepayWebhookDto, Object], PaymentController.prototype, method);
    }
    Reflect.defineMetadata('design:paramtypes', [String, CreateOrderDto], PaymentController.prototype, 'createOrder');
    Reflect.defineMetadata('design:paramtypes', [ReconciliationQueryDto], PaymentController.prototype, 'getReconciliationQueue');
    Reflect.defineMetadata('design:paramtypes', [String, String, ReprocessPaymentDto], PaymentController.prototype, 'reprocessPayment');
    Reflect.defineMetadata('design:paramtypes', [String, String, ResolvePaymentDto], PaymentController.prototype, 'resolvePayment');
    Reflect.defineMetadata('design:paramtypes', [String, RegisterFreeCourseDto], EnrollmentController.prototype, 'registerFreeCourse');
    const module = await Test.createTestingModule({
      controllers: [PaymentController, EnrollmentController],
      providers: [{ provide: PaymentService, useValue: service }, { provide: EnrollmentService, useValue: freeService }],
    }).compile();
    app = module.createNestApplication({ rawBody: true, logger: false });
    // Authentication is scoped to the test server; authorization uses the real RolesGuard.
    app.use((req: { headers: Record<string, string>; user?: unknown }, _res: unknown, next: () => void) => {
      if (req.headers['x-test-user']) req.user = { id: req.headers['x-test-user'], role: req.headers['x-test-role'] || RoleEnum.STUDENT };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  }, 20000);

  beforeEach(async () => {
    await Promise.all([users.deleteMany({}), courses.deleteMany({}), orders.deleteMany({}), payments.deleteMany({}), enrollments.deleteMany({})]);
    const instructor = await users.create({ email: 'teacher@test.invalid', fullName: 'Instructor', role: RoleEnum.INSTRUCTOR });
    const user = await users.create({ email: 'student@test.invalid', fullName: 'Student', status: UserStatusEnum.ACTIVE });
    const course = await courses.create({ title: 'Paid course', slug: 'paid-course', price: 499000, originalPrice: 799000, status: CourseStatusEnum.PUBLISHED, instructorId: instructor._id });
    userId = String(user._id); courseId = String(course._id);
  });

  afterEach(() => { vi.restoreAllMocks(); });
  afterAll(async () => {
    await app?.close();
    try {
      if (connection.readyState === 1 && connection.name === dbName && dbName.startsWith('mindly_payment_test_')) await connection.dropDatabase();
    } finally { await connection.close(); }
  });

  function signed(orderCode: string, overrides: Record<string, unknown> = {}) {
    const payload = {
      id: sequence++, gateway: 'MBBank', transactionDate: new Date().toISOString(),
      accountNumber: '0333338888', code: orderCode, content: `${orderCode} hoc phi`,
      transferType: 'in', transferAmount: 499000, ...overrides,
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers = {
      'x-sepay-timestamp': timestamp,
      'x-sepay-signature': `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex')}`,
    };
    return { payload, raw, headers };
  }

  function deliver(event: ReturnType<typeof signed>) {
    return service.processSepayWebhook(event.headers, event.raw, event.payload as SepayWebhookDto);
  }

  it('allows one PENDING checkout under concurrent create requests', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => service.createOrder(userId, courseId)));
    expect(new Set(results.map((result) => result.order.orderCode)).size).toBe(1);
    expect(results[0].order.orderCode).toMatch(/^MD[A-Z0-9]{10}$/);
    expect(await orders.countDocuments({ status: OrderStatusEnum.PENDING })).toBe(1);
  });

  it('uses INSERT retry for an order-code collision including a soft-deleted historical row', async () => {
    await orders.create({ orderCode: 'MD7K2P9X4A6B', userId, courseId, amount: 1, status: OrderStatusEnum.EXPIRED, deletedAt: new Date() });
    const sepay = (service as unknown as { sepayService: SepayService }).sepayService;
    vi.spyOn(sepay, 'generateOrderCode').mockReturnValueOnce('MD7K2P9X4A6B').mockReturnValueOnce('MD8L3Q0Y5B7C');
    expect((await service.createOrder(userId, courseId)).order.orderCode).toBe('MD8L3Q0Y5B7C');
  });

  it('records a receipt and activates only once for simultaneous deliveries of the same signed event', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    await Promise.all(Array.from({ length: 6 }, () => deliver(event)));
    expect(await payments.countDocuments()).toBe(1);
    expect(await enrollments.countDocuments()).toBe(1);
    expect((await orders.findById(checkout.order.id))?.status).toBe(OrderStatusEnum.PAID);
  });

  it('serializes different concurrent transfers and flags the second as duplicate, not another sale', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await Promise.all([deliver(signed(checkout.order.orderCode)), deliver(signed(checkout.order.orderCode))]);
    expect(await enrollments.countDocuments()).toBe(1);
    expect(await payments.countDocuments({ reconciliationStatus: ReconciliationStatusEnum.MATCHED })).toBe(1);
    expect(await payments.countDocuments({ reconciliationStatus: ReconciliationStatusEnum.DUPLICATE_PAYMENT })).toBe(1);
  });

  it('accumulates simultaneous partial transfers exactly once', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const first = signed(checkout.order.orderCode, { transferAmount: 200000 });
    const second = signed(checkout.order.orderCode, { transferAmount: 299000 });
    await Promise.all([deliver(first), deliver(second)]);
    await deliver(first);
    expect(await payments.countDocuments()).toBe(2);
    expect(await enrollments.countDocuments()).toBe(1);
    const paid = await orders.findById(checkout.order.id);
    expect(paid?.receivedAmount).toBe(499000);
    expect(await payments.countDocuments({ appliedAt: { $ne: null }, reconciliationStatus: ReconciliationStatusEnum.MATCHED })).toBe(2);
  });

  it('rolls back Payment AND Order if enrollment creation fails, then allows the signed retry', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    vi.spyOn(enrollmentRepository, 'create').mockRejectedValueOnce(new Error('Injected write failure'));
    await expect(deliver(event)).rejects.toThrow('Injected write failure');
    expect(await payments.countDocuments()).toBe(0);
    expect((await orders.findById(checkout.order.id))?.status).toBe(OrderStatusEnum.PENDING);
    await deliver(event);
    expect(await payments.countDocuments()).toBe(1);
    expect(await enrollments.countDocuments()).toBe(1);
  });

  it('never downgrades PAID with a stale expiry update', async () => {
    const checkout = await service.createOrder(userId, courseId);
    // Backdate the fixture through the raw collection: createdAt is immutable in Mongoose updates.
    await orders.collection.updateOne({ _id: new mongoose.Types.ObjectId(checkout.order.id) }, { $set: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 60000) } });
    const lateDelivery = signed(checkout.order.orderCode, { transactionDate: new Date(Date.now() - 2000).toISOString() });
    await deliver(lateDelivery);
    expect(await orderRepository.expirePendingOrder(checkout.order.id, new Date())).toBeNull();
    expect((await service.getOrderStatus(userId, RoleEnum.STUDENT, checkout.order.orderCode)).status).toBe(OrderStatusEnum.PAID);
  });

  it('accepts an on-time bank event delivered after expiry and cancels the replacement pending checkout', async () => {
    const first = await service.createOrder(userId, courseId);
    await orders.collection.updateOne({ _id: new mongoose.Types.ObjectId(first.order.id) }, { $set: { expiresAt: new Date(Date.now() - 10000), createdAt: new Date(Date.now() - 60000) } });
    const replacement = await service.createOrder(userId, courseId);
    await deliver(signed(first.order.orderCode, { transactionDate: new Date(Date.now() - 20000).toISOString() }));
    expect((await orders.findById(first.order.id))?.status).toBe(OrderStatusEnum.PAID);
    expect((await orders.findById(replacement.order.id))?.status).toBe(OrderStatusEnum.CANCELLED);
    expect(await orders.countDocuments({ pendingCheckoutKey: { $exists: true } })).toBe(0);
  });

  it('does not activate late, cancelled, invalid-account or ambiguous-memo transfers', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await orders.updateOne({ _id: checkout.order.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await deliver(signed(checkout.order.orderCode))).reconciliationStatus).toBe(ReconciliationStatusEnum.EXPIRED_ORDER);
    await orders.updateOne({ _id: checkout.order.id }, { $set: { status: OrderStatusEnum.CANCELLED } });
    expect((await deliver(signed(checkout.order.orderCode))).reconciliationStatus).toBe(ReconciliationStatusEnum.CANCELLED_ORDER);
    expect((await deliver(signed(checkout.order.orderCode, { accountNumber: '000000' }))).reconciliationStatus).toBe(ReconciliationStatusEnum.INVALID_ACCOUNT);
    expect((await deliver(signed(checkout.order.orderCode, { content: `${checkout.order.orderCode} MD12345` }))).reconciliationStatus).toBe(ReconciliationStatusEnum.UNMATCHED_ORDER);
    expect(await enrollments.countDocuments()).toBe(0);
  });

  it('keeps checkout and bank snapshots stable after price/account changes', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await courses.updateOne({ _id: courseId }, { $set: { price: 999000, title: 'Changed title' } });
    config.set('SEPAY_BANK_ACCOUNT', '9999999999');
    try {
      const detail = await service.getCheckoutOrder(userId, RoleEnum.STUDENT, checkout.order.orderCode);
      expect(detail.amount).toBe(499000);
      expect(detail.course?.title).toBe('Paid course');
      expect(detail.paymentInfo?.bankAccount).toBe('0333338888');
      await deliver(signed(checkout.order.orderCode));
      expect(await enrollments.countDocuments()).toBe(1);
    } finally { config.set('SEPAY_BANK_ACCOUNT', '0333338888'); }
  });

  it('still processes existing MD + five-digit orders without creating any more short codes', async () => {
    const legacy = await orders.create({ orderCode: 'MD12345', userId, courseId, amount: 499000, expiresAt: new Date(Date.now() + 600000), paymentMethod: 'SEPAY_BANK_TRANSFER' });
    expect((await service.createOrder(userId, courseId)).order.orderCode).toBe('MD12345');
    await deliver(signed('MD12345', { code: null }));
    expect((await orders.findById(legacy._id))?.status).toBe(OrderStatusEnum.PAID);
  });

  it('repairs a historical partial activation only using the original signed bank receipt', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    await payments.create({
      orderId: checkout.order.id, orderCode: checkout.order.orderCode, sepayTransactionId: String(event.payload.id),
      amountIn: 499000, bankBrandName: 'MBBank', accountNumber: '0333338888', content: event.payload.content,
      transactionDate: new Date(event.payload.transactionDate), reconciliationStatus: ReconciliationStatusEnum.MATCHED,
      rawPayload: event.payload,
    });
    await orders.updateOne({ _id: checkout.order.id }, { $set: { status: OrderStatusEnum.PAID, paidAt: new Date() }, $unset: { pendingCheckoutKey: 1 } });
    await deliver(event);
    expect(await enrollments.countDocuments()).toBe(1);
    expect(await payments.countDocuments()).toBe(1);
  });

  it('can map a verified unmatched payment, but cannot rebind money already linked to a different order', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await deliver(signed('', { code: null, content: 'Chuyen tien hoc phi' }));
    const receipt = await payments.findOne();
    await service.reprocessPayment(String(receipt!._id), userId, { orderCode: checkout.order.orderCode, note: 'Đối chiếu người gửi và sao kê' });
    expect(await enrollments.countDocuments()).toBe(1);
    expect((await payments.findById(receipt!._id))?.auditHistory?.[0].action).toBe('REPROCESS');
  });

  it('keeps an already-fulfilled legacy receipt idempotent without relabeling it as a duplicate', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    await deliver(event);
    await payments.updateMany({}, { $unset: { appliedAt: 1, verifiedAt: 1, payloadHash: 1 } });
    expect((await deliver(event)).reconciliationStatus).toBe(ReconciliationStatusEnum.MATCHED);
    expect(await enrollments.countDocuments()).toBe(1);
    expect(await payments.countDocuments()).toBe(1);
  });

  it('does not resurrect revoked legacy access when a signed receipt is replayed', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    await deliver(event);
    await payments.updateMany({}, { $unset: { appliedAt: 1, verifiedAt: 1, payloadHash: 1 } });
    await enrollments.updateMany({}, { $set: { deletedAt: new Date() } });
    expect((await deliver(event)).reconciliationStatus).toBe(ReconciliationStatusEnum.UNAVAILABLE_ORDER);
    expect(await enrollments.countDocuments({ deletedAt: null })).toBe(0);
  });

  it('records only the refundable excess after a bank refund, without revoking tuition or issuing new money', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await deliver(signed(checkout.order.orderCode, { transferAmount: 550000 }));
    const receipt = await payments.findOne();
    await expect(service.resolvePayment(String(receipt!._id), userId, { type: 'REFUNDED', note: 'Hoàn tiền đã đối soát', refundedAmount: 550000, bankReference: 'FT12345' })).rejects.toThrow();
    await service.resolvePayment(String(receipt!._id), userId, { type: 'REFUNDED', note: 'Hoàn lại phần tiền thừa', refundedAmount: 51000, bankReference: 'FT12345' });
    expect((await payments.findById(receipt!._id))?.resolution?.refundedAmount).toBe(51000);
    expect((await orders.findById(checkout.order.id))?.status).toBe(OrderStatusEnum.PAID);
    expect(await enrollments.countDocuments()).toBe(1);
  });

  it('excludes a refunded partial transfer from any future activation', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await deliver(signed(checkout.order.orderCode, { transferAmount: 200000 }));
    const receipt = await payments.findOne();
    await service.resolvePayment(String(receipt!._id), userId, { type: 'REFUNDED', note: 'Hoàn giao dịch chuyển thiếu', refundedAmount: 200000, bankReference: 'FT67890' });
    await deliver(signed(checkout.order.orderCode, { transferAmount: 299000 }));
    expect((await orders.findById(checkout.order.id))?.receivedAmount).toBe(299000);
    expect(await enrollments.countDocuments()).toBe(0);
  });

  it('has no purchase endpoint and rejects using free registration for a paid course', async () => {
    await request(app.getHttpServer()).post('/enrollments/purchase').set('x-test-user', userId).send({ courseId }).expect(404);
    await request(app.getHttpServer()).post('/enrollments/register-free').set('x-test-user', userId).send({ courseId }).expect(400);
    expect(await orders.countDocuments()).toBe(0);
    expect(await enrollments.countDocuments()).toBe(0);
    await courses.updateOne({ _id: courseId }, { $set: { price: 0 } });
    await Promise.all(Array.from({ length: 3 }, () => freeService.registerFreeCourse(userId, courseId)));
    expect(await enrollments.countDocuments()).toBe(1);
    expect(await orders.countDocuments()).toBe(0);
    expect(await payments.countDocuments()).toBe(0);
  });

  it('requires authentication/ownership for checkout and admin role for reconciliation', async () => {
    const checkout = await service.createOrder(userId, courseId);
    await request(app.getHttpServer()).get(`/payments/orders/${checkout.order.orderCode}`).expect(403);
    await request(app.getHttpServer()).get(`/payments/order-status/${checkout.order.orderCode}`).set('x-test-user', '000000000000000000000099').expect(403);
    await request(app.getHttpServer()).get('/payments/reconciliation').set('x-test-user', userId).expect(403);
    await request(app.getHttpServer()).get('/payments/reconciliation').set('x-test-user', userId).set('x-test-role', RoleEnum.ADMIN).expect(200);
    await request(app.getHttpServer()).get('/payments/reconciliation?limit=1000').set('x-test-user', userId).set('x-test-role', RoleEnum.ADMIN).expect(400);
  });

  it('verifies original HTTP raw bytes and returns the exact SePay ACK for both webhook routes', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    const first = await request(app.getHttpServer()).post('/payments/sepay/webhook').set(event.headers).set('Content-Type', 'application/json').send(event.raw.toString()).expect(200);
    expect(first.body).toEqual({ success: true });
    const second = await request(app.getHttpServer()).post('/payments/webhook').set(event.headers).set('Content-Type', 'application/json').send(event.raw.toString()).expect(200);
    expect(second.body).toEqual({ success: true });
    expect(await payments.countDocuments()).toBe(1);
  });

  it('rejects tampered bytes, invalid amounts, and malformed transaction IDs before any writes', async () => {
    const checkout = await service.createOrder(userId, courseId);
    const event = signed(checkout.order.orderCode);
    await request(app.getHttpServer()).post('/payments/webhook').set(event.headers).send({ ...event.payload, transferAmount: 1 }).expect(401);
    for (const fields of [{ transferAmount: -1 }, { transferAmount: 1.5 }, { id: {} }]) {
      const invalid = signed(checkout.order.orderCode, fields);
      await request(app.getHttpServer()).post('/payments/webhook').set(invalid.headers).set('Content-Type', 'application/json').send(invalid.raw.toString()).expect(400);
    }
    expect(await payments.countDocuments()).toBe(0);
  });

  it('returns a retryable HTTP error when reconciliation persistence fails', async () => {
    const event = signed('', { code: null, content: 'Chuyen tien khong co ma' });
    vi.spyOn(paymentRepository, 'create').mockRejectedValueOnce(new Error('Injected storage failure'));
    await request(app.getHttpServer()).post('/payments/webhook').set(event.headers).set('Content-Type', 'application/json').send(event.raw.toString()).expect(500);
    expect(await payments.countDocuments()).toBe(0);
  });
});
