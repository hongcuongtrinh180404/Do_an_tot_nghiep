import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  ForbiddenException, ServiceUnavailableException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  IPayment, IOrder, ICourse, ICreateOrderResponse, IOrderStatusResponse, ICheckoutOrderResponse,
  OrderStatusEnum, ReconciliationStatusEnum, CourseStatusEnum, UserStatusEnum, RoleEnum,
} from 'share-lib';
import { BaseService, isDuplicateKeyError } from '../../base/index.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository, OrderStatusRecord } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { SepayService } from './sepay.service.js';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto.js';
import { ReprocessPaymentDto, ResolvePaymentDto } from '../dto/reconciliation.dto.js';
import { parseSepayTransactionDate } from '../utils/transaction-date.util.js';

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  reconciliationStatus?: ReconciliationStatusEnum;
  orderCode?: string | null;
}

@Injectable()
export class PaymentService extends BaseService<IPayment, string> {
  constructor(
    protected readonly paymentRepository: PaymentRepository,
    protected readonly orderRepository: OrderRepository,
    protected readonly enrollmentRepository: EnrollmentRepository,
    protected readonly courseRepository: CourseRepository,
    protected readonly userRepository: UserRepository,
    protected readonly sepayService: SepayService,
    cls: ClsService,
  ) {
    super(paymentRepository, cls, PaymentService.name);
  }

  async createOrder(userId: string, courseId: string): Promise<ICreateOrderResponse> {
    const config = this.sepayService.getPaymentConfiguration();
    const [user, course, enrollment] = await Promise.all([
      this.userRepository.findById(userId),
      this.courseRepository.findById(courseId),
      this.enrollmentRepository.findByUserAndCourse(userId, courseId),
    ]);
    if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE) {
      throw new BadRequestException('Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa');
    }
    if (!course || course.deletedAt) throw new NotFoundException('Không tìm thấy khóa học');
    if (course.status !== CourseStatusEnum.PUBLISHED) throw new BadRequestException('Khóa học chưa công khai');
    if (course.instructorId === userId || enrollment) throw new ConflictException('Bạn đã sở hữu khóa học này');
    if (!Number.isSafeInteger(course.price) || course.price <= 0) {
      throw new BadRequestException('Khóa miễn phí phải đăng ký trực tiếp; giá thanh toán phải là số nguyên VND dương');
    }

    // The sparse unique checkout key works without deleting/mutating historical orders.
    for (let attempt = 0; attempt < 5; attempt++) {
      await this.orderRepository.expirePendingOrders(userId, courseId);
      const pending = await this.orderRepository.findPendingOrderByUserAndCourse(userId, courseId);
      if (pending) return this.toCreateResponse(pending, course);

      const originalPrice = Number.isSafeInteger(course.originalPrice) && (course.originalPrice ?? 0) > course.price
        ? course.originalPrice! : course.price;
      try {
        const order = await this.orderRepository.create({
          orderCode: this.sepayService.generateOrderCode(), userId, courseId,
          amount: course.price, originalPrice, discountAmount: originalPrice - course.price,
          paymentMethod: 'SEPAY_BANK_TRANSFER', status: OrderStatusEnum.PENDING,
          expiresAt: new Date(Date.now() + config.expireMinutes * 60000),
          pendingCheckoutKey: `${userId}:${courseId}`,
          instructorCommissionRate: 0.7, instructorEarnings: Math.round(course.price * 0.7),
          courseSnapshot: {
            title: course.title, slug: course.slug, thumbnailUrl: course.thumbnailUrl,
            instructorName: course.instructor?.fullName,
          },
          bankSnapshot: { bankAccount: config.bankAccount, bankCode: config.bankCode, accountName: config.accountName },
        });
        return this.toCreateResponse(order, course);
      } catch (error: unknown) {
        // Handles BOTH an order-code collision and a concurrent checkout for this pair.
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    throw new ServiceUnavailableException('Không thể tạo đơn hàng lúc này. Vui lòng thử lại');
  }

  private toCreateResponse(order: IOrder, course: ICourse): ICreateOrderResponse {
    const bank = order.bankSnapshot ?? this.sepayService.getPaymentConfiguration();
    const amountDue = Math.max(0, order.amount - (order.receivedAmount ?? 0));
    const expiresAt = new Date(order.expiresAt!).toISOString();
    return {
      order: {
        id: order.id, orderCode: order.orderCode, amount: order.amount,
        originalPrice: order.originalPrice || order.amount, discountAmount: order.discountAmount ?? 0,
        status: order.status, expiresAt,
      },
      course: {
        id: order.courseId, title: order.courseSnapshot?.title ?? course.title,
        slug: order.courseSnapshot?.slug ?? course.slug,
        thumbnailUrl: order.courseSnapshot?.thumbnailUrl ?? course.thumbnailUrl,
        price: order.amount, originalPrice: order.originalPrice || order.amount,
      },
      paymentInfo: {
        bankAccount: bank.bankAccount, bankCode: bank.bankCode, accountName: bank.accountName,
        amount: amountDue, orderCode: order.orderCode, expiresAt,
        qrUrl: this.sepayService.generateVietQrUrl({ ...bank, amount: amountDue, orderCode: order.orderCode }),
      },
    };
  }

  async getOrderStatus(userId: string, userRole: RoleEnum, orderCode: string): Promise<IOrderStatusResponse> {
    const code = this.requireOrderCode(orderCode);
    let order = await this.orderRepository.findStatusByOrderCode(code);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    this.assertOwner(order, userId, userRole);
    if (order.status === OrderStatusEnum.PENDING && order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      order = await this.orderRepository.expirePendingOrder(order.id, new Date())
        ?? await this.orderRepository.findStatusByOrderCode(code);
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return this.toStatusResponse(order);
  }

  async getCheckoutOrder(userId: string, role: RoleEnum, orderCode: string): Promise<ICheckoutOrderResponse> {
    const order = await this.orderRepository.findByOrderCode(this.requireOrderCode(orderCode));
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    this.assertOwner(order, userId, role);
    let status = this.toStatusResponse(order);
    if (order.status === OrderStatusEnum.PENDING && order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
      status = await this.getOrderStatus(userId, role, order.orderCode);
    }

    let course: ICheckoutOrderResponse['course'] = order.courseSnapshot ? { id: order.courseId, ...order.courseSnapshot } : null;
    if (!course) {
      // Legacy orders only; new orders have a stable checkout snapshot.
      const current = await this.courseRepository.findById(order.courseId);
      if (current) course = {
        id: current.id, title: current.title, slug: current.slug,
        thumbnailUrl: current.thumbnailUrl, instructorName: current.instructor?.fullName,
      };
    }
    const response: ICheckoutOrderResponse = {
      ...status, originalPrice: order.originalPrice || order.amount,
      discountAmount: order.discountAmount ?? 0, course,
    };
    if (status.status === OrderStatusEnum.PENDING) {
      const bank = order.bankSnapshot ?? this.sepayService.getPaymentConfiguration();
      const amount = Math.max(0, order.amount - status.receivedAmount);
      response.paymentInfo = {
        bankAccount: bank.bankAccount, bankCode: bank.bankCode, accountName: bank.accountName,
        amount, orderCode: order.orderCode,
        qrUrl: this.sepayService.generateVietQrUrl({ ...bank, amount, orderCode: order.orderCode }),
      };
    }
    return response;
  }

  private requireOrderCode(value: string): string {
    const code = this.sepayService.normalizeOrderCode(value);
    if (!code) throw new NotFoundException('Mã đơn hàng không hợp lệ');
    return code;
  }

  private assertOwner(order: OrderStatusRecord, userId: string, role: RoleEnum): void {
    if (order.userId !== userId && role !== RoleEnum.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này');
    }
  }

  private toStatusResponse(order: OrderStatusRecord): IOrderStatusResponse {
    return {
      orderCode: order.orderCode, status: order.status, amount: order.amount, courseId: order.courseId,
      isPaid: order.status === OrderStatusEnum.PAID, isExpired: order.status === OrderStatusEnum.EXPIRED,
      expiresAt: order.expiresAt ? new Date(order.expiresAt).toISOString() : '',
      paidAt: order.paidAt ? new Date(order.paidAt).toISOString() : null,
      receivedAmount: order.receivedAmount ?? (order.status === OrderStatusEnum.PAID ? order.amount : 0),
      reconciliationStatus: order.lastPaymentStatus, serverTime: new Date().toISOString(),
    };
  }

  async processSepayWebhook(
    headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string | undefined, payload: SepayWebhookDto,
  ): Promise<WebhookProcessResult> {
    this.sepayService.verifyWebhookSignature(headers, rawBody);
    this.validateTransfer(payload);
    if (payload.transferType === 'out') return { success: true, message: 'Bỏ qua giao dịch tiền ra' };
    this.sepayService.getPaymentConfiguration();

    return this.withReceiptRetry(async (session) => {
      const existing = await this.paymentRepository.findBySepayTransactionId(String(payload.id), session);
      if (existing) {
        this.assertSameReceipt(existing, payload);
        if (existing.deletedAt) return this.receiptResult(existing, 'Giao dịch đã được ghi nhận');
        // A signed replay can verify legacy receipts and repair pre-transaction partial failures.
        const receipt = existing.verifiedAt ? existing : await this.paymentRepository.updateReconciliation(existing.id, {
          verifiedAt: new Date(), payloadHash: createHash('sha256').update(rawBody!).digest('hex'),
          transactionDate: parseSepayTransactionDate(payload.transactionDate),
        }, session);
        if (!receipt.appliedAt && !receipt.resolution && [ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID].includes(receipt.reconciliationStatus)) {
          return this.reconcileReceipt(receipt, session);
        }
        return this.receiptResult(receipt, 'Giao dịch đã được ghi nhận trước đó');
      }

      const receipt = await this.paymentRepository.create({
        sepayTransactionId: String(payload.id), amountIn: payload.transferAmount,
        bankBrandName: payload.gateway ?? '', accountNumber: payload.accountNumber.trim(),
        transactionDate: parseSepayTransactionDate(payload.transactionDate), content: payload.content.trim(),
        orderCode: this.sepayService.extractOrderCode(payload.code, payload.content), orderId: null,
        reconciliationStatus: ReconciliationStatusEnum.UNMATCHED_ORDER,
        rawPayload: payload as unknown as Record<string, unknown>, verifiedAt: new Date(),
        payloadHash: createHash('sha256').update(rawBody!).digest('hex'),
      }, session);
      return this.reconcileReceipt(receipt, session);
    });
  }

  private validateTransfer(payload: SepayWebhookDto): void {
    if (
      (typeof payload.id !== 'string' && typeof payload.id !== 'number') ||
      (typeof payload.id === 'number' && !Number.isSafeInteger(payload.id)) ||
      !/^[1-9]\d{0,19}$/.test(String(payload.id)) ||
      !Number.isSafeInteger(payload.transferAmount) || payload.transferAmount <= 0 ||
      !['in', 'out'].includes(payload.transferType) || typeof payload.content !== 'string' ||
      typeof payload.accountNumber !== 'string' || !payload.accountNumber.trim()
    ) throw new BadRequestException('Dữ liệu giao dịch SePay không hợp lệ');
  }

  private assertSameReceipt(payment: IPayment, payload: SepayWebhookDto): void {
    if (payment.amountIn !== payload.transferAmount || payment.accountNumber !== payload.accountNumber.trim() || payment.content !== payload.content.trim()) {
      throw new ConflictException('ID giao dịch đã tồn tại với thông tin khác');
    }
  }

  private async withReceiptRetry<R>(operation: (session: ClientSession) => Promise<R>): Promise<R> {
    const deadline = Date.now() + 20000;
    for (let attempt = 0; ; attempt++) {
      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new ServiceUnavailableException('Xử lý giao dịch quá thời gian, vui lòng gửi lại webhook');
        return await this.paymentRepository.runTransaction(operation, remaining);
      } catch (error: unknown) {
        // Duplicate receipt/enrollment races must re-read in a NEW transaction.
        if (!isDuplicateKeyError(error) || attempt >= 2) throw error;
      }
    }
  }

  private async reconcileReceipt(receipt: IPayment, session: ClientSession): Promise<WebhookProcessResult> {
    const config = this.sepayService.getPaymentConfiguration();
    const found = receipt.orderCode ? await this.orderRepository.findByOrderCode(receipt.orderCode, session) : null;
    const order = found ? await this.orderRepository.lockForPaymentProcessing(found.id, session) : null;
    const flag = async (status: ReconciliationStatusEnum, message: string): Promise<WebhookProcessResult> => {
      const saved = await this.paymentRepository.updateReconciliation(receipt.id, {
        orderId: order?.id ?? null, reconciliationStatus: status,
      }, session);
      if (order) await this.orderRepository.recordReceipt(order.id, status, session);
      return this.receiptResult(saved, message);
    };

    const expectedAccount = order?.bankSnapshot?.bankAccount ?? config.bankAccount;
    if (receipt.accountNumber !== expectedAccount) return flag(ReconciliationStatusEnum.INVALID_ACCOUNT, 'Tài khoản nhận không khớp');
    if (!order) return flag(ReconciliationStatusEnum.UNMATCHED_ORDER, 'Cần đối soát mã chuyển khoản');
    if (order.status === OrderStatusEnum.CANCELLED) return flag(ReconciliationStatusEnum.CANCELLED_ORDER, 'Đơn đã hủy, cần đối soát/hoàn tiền');

    const date = receipt.transactionDate ? new Date(receipt.transactionDate) : null;
    const createdAt = new Date(order.createdAt).getTime();
    if (!date || !Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000 || date.getTime() < Math.floor(createdAt / 1000) * 1000) {
      return flag(ReconciliationStatusEnum.INVALID_TRANSACTION_DATE, 'Thời gian giao dịch không hợp lệ, cần đối soát');
    }
    if (order.paymentMethod !== 'SEPAY_BANK_TRANSFER' || !Number.isFinite(createdAt) ||
      !order.expiresAt || !Number.isFinite(new Date(order.expiresAt).getTime()) ||
      !Number.isSafeInteger(order.amount) || order.amount <= 0) {
      return flag(ReconciliationStatusEnum.UNAVAILABLE_ORDER, 'Đơn hàng không đủ điều kiện kích hoạt tự động');
    }

    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(order.userId, order.courseId, session);
    const isLegacyRepair = receipt.orderId === order.id && !receipt.appliedAt &&
      [ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID].includes(receipt.reconciliationStatus);
    if (order.status === OrderStatusEnum.PAID && isLegacyRepair && existingEnrollment) {
      return this.receiptResult(receipt, 'Đơn hàng đã được kích hoạt trước đó');
    }
    if (order.status === OrderStatusEnum.PAID && !isLegacyRepair) {
      return flag(ReconciliationStatusEnum.DUPLICATE_PAYMENT, 'Đơn đã thanh toán, giao dịch bổ sung cần đối soát/hoàn tiền');
    }
    if (order.status === OrderStatusEnum.PAID && isLegacyRepair &&
      await this.enrollmentRepository.hasRevokedEnrollment(order.userId, order.courseId, order.id, session)) {
      return flag(ReconciliationStatusEnum.UNAVAILABLE_ORDER, 'Quyền học của đơn cũ đã bị thu hồi, không tự cấp lại');
    }
    if (existingEnrollment) return flag(ReconciliationStatusEnum.ALREADY_ENROLLED, 'Người mua đã sở hữu khóa học, cần đối soát/hoàn tiền');
    // Arrival time is irrelevant: a signed bank transfer made before the deadline is valid even after EXPIRED.
    if (date.getTime() > new Date(order.expiresAt).getTime()) {
      return flag(ReconciliationStatusEnum.EXPIRED_ORDER, 'Tiền đến sau hạn thanh toán, cần đối soát/hoàn tiền');
    }

    // Operations within one MongoDB session must not be parallelized.
    const user = await this.userRepository.findById(order.userId, session);
    const course = await this.courseRepository.findForEnrollment(order.courseId, session);
    if (!user || user.status !== UserStatusEnum.ACTIVE || user.deletedAt || !course || course.deletedAt || course.instructorId === order.userId) {
      return flag(ReconciliationStatusEnum.UNAVAILABLE_ORDER, 'Tài khoản hoặc khóa học không còn khả dụng, cần đối soát');
    }

    await this.paymentRepository.updateReconciliation(receipt.id, {
      orderId: order.id, orderCode: order.orderCode, reconciliationStatus: ReconciliationStatusEnum.UNDERPAID,
    }, session);
    const eligible = (await this.paymentRepository.getEligibleReceipts(order.id, session)).filter((payment) => {
      const at = payment.transactionDate ? new Date(payment.transactionDate).getTime() : NaN;
      return payment.verifiedAt && payment.amountIn - (payment.resolution?.refundedAmount ?? 0) > 0 &&
        payment.accountNumber === expectedAccount && Number.isFinite(at) &&
        at >= Math.floor(createdAt / 1000) * 1000 && at <= new Date(order.expiresAt!).getTime();
    });
    const receivedAmount = eligible.reduce((sum, payment) => sum + payment.amountIn - (payment.resolution?.refundedAmount ?? 0), 0);
    if (!Number.isSafeInteger(receivedAmount) || receivedAmount < 0) throw new BadRequestException('Tổng tiền giao dịch vượt giới hạn hợp lệ');
    if (receivedAmount < order.amount) {
      await this.orderRepository.recordReceipt(order.id, ReconciliationStatusEnum.UNDERPAID, session, receivedAmount);
      return { success: true, message: 'Đã ghi nhận tiền, cần chuyển đủ phần còn thiếu trước hạn', reconciliationStatus: ReconciliationStatusEnum.UNDERPAID, orderCode: order.orderCode };
    }

    const status = receivedAmount > order.amount ? ReconciliationStatusEnum.OVERPAID : ReconciliationStatusEnum.MATCHED;
    const paidAt = new Date(Math.max(...eligible.map((payment) => new Date(payment.transactionDate!).getTime())));
    if (order.status !== OrderStatusEnum.PAID) {
      const paid = await this.orderRepository.markPaid(order.id, paidAt, receivedAmount, status, session);
      if (!paid) throw new ConflictException('Trạng thái đơn hàng đã thay đổi, vui lòng gửi lại webhook');
    } else {
      // Repair a previously saved PAID order that lacks enrollment; no synthetic payment is created.
      await this.orderRepository.recordReceipt(order.id, status, session, receivedAmount);
    }
    await this.enrollmentRepository.create({
      userId: order.userId, courseId: order.courseId, orderId: order.id, enrolledAt: new Date(),
    }, session);
    await this.paymentRepository.markReceiptsApplied(eligible.map((payment) => payment.id), new Date(), session);
    const saved = await this.paymentRepository.updateReconciliation(receipt.id, {
      reconciliationStatus: status, excessAmount: Math.max(0, receivedAmount - order.amount),
    }, session);
    await this.orderRepository.cancelOtherPendingOrders(order, session);
    return this.receiptResult(saved, 'Đã xác nhận thanh toán và kích hoạt quyền học');
  }

  private receiptResult(payment: IPayment, message: string): WebhookProcessResult {
    return { success: true, message, reconciliationStatus: payment.reconciliationStatus, orderCode: payment.orderCode };
  }

  async getReconciliationQueue(page: number, limit: number) {
    return { ...await this.paymentRepository.findReconciliationQueue(page, limit), page, limit };
  }

  async reprocessPayment(paymentId: string, actorId: string, dto: ReprocessPaymentDto): Promise<WebhookProcessResult> {
    return this.withReceiptRetry(async (session) => {
      const payment = await this.paymentRepository.findById(paymentId, session);
      if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
      if (!payment.verifiedAt || !payment.payloadHash) throw new ConflictException('Giao dịch cũ cần được replay từ SePay để xác thực trước khi xử lý lại');
      if (payment.resolution) throw new ConflictException('Giao dịch đã được đóng đối soát');
      if (payment.appliedAt) return this.receiptResult(payment, 'Giao dịch đã được áp dụng, không cấp quyền lần nữa');
      if (dto.orderCode && payment.orderId && dto.orderCode !== payment.orderCode) {
        throw new ConflictException('Không được chuyển giao dịch đã liên kết sang đơn khác');
      }
      const updated = await this.paymentRepository.updateReconciliation(payment.id, {
        orderCode: dto.orderCode ? this.requireOrderCode(dto.orderCode) : payment.orderCode,
      }, session, {
        action: 'REPROCESS', actorId, note: dto.note, at: new Date(),
        previousStatus: payment.reconciliationStatus, previousOrderCode: payment.orderCode,
      });
      return this.reconcileReceipt(updated, session);
    });
  }

  /** Records an external/manual resolution. This endpoint never moves money or marks an order PAID. */
  async resolvePayment(paymentId: string, actorId: string, dto: ResolvePaymentDto): Promise<IPayment> {
    return this.withReceiptRetry(async (session) => {
      const payment = await this.paymentRepository.findById(paymentId, session);
      if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
      if (payment.resolution) throw new ConflictException('Giao dịch đã được đóng đối soát');
      const order = payment.orderCode ? await this.orderRepository.findByOrderCode(payment.orderCode, session) : null;
      if (order) await this.orderRepository.lockForPaymentProcessing(order.id, session);
      if (dto.type === 'REFUNDED') {
        const refundable = payment.appliedAt ? payment.excessAmount ?? 0 : payment.amountIn;
        if (!dto.bankReference || !refundable || dto.refundedAmount !== refundable) {
          throw new BadRequestException('Cần mã giao dịch hoàn tiền và đúng số tiền có thể hoàn (chỉ phần thừa nếu đã cấp quyền học)');
        }
      }
      const updated = await this.paymentRepository.updateReconciliation(payment.id, {
        resolution: {
          type: dto.type, note: dto.note, actorId, at: new Date(),
          ...(dto.type === 'REFUNDED' ? { bankReference: dto.bankReference, refundedAmount: dto.refundedAmount } : {}),
        },
      }, session, {
        action: 'RESOLVE', actorId, note: dto.note, at: new Date(),
        previousStatus: payment.reconciliationStatus, previousOrderCode: payment.orderCode,
      });
      if (order && order.status !== OrderStatusEnum.PAID && dto.type === 'REFUNDED') {
        const receipts = await this.paymentRepository.getEligibleReceipts(order.id, session);
        const amount = receipts.reduce((sum, item) => sum + item.amountIn - (item.resolution?.refundedAmount ?? 0), 0);
        await this.orderRepository.recordReceipt(order.id, order.lastPaymentStatus ?? payment.reconciliationStatus, session, amount);
      }
      return updated;
    });
  }
}
