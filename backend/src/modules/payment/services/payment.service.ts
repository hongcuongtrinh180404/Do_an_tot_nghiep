import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  IPayment,
  IOrder,
  ICreateOrderResponse,
  IOrderStatusResponse,
  OrderStatusEnum,
  ReconciliationStatusEnum,
  CourseStatusEnum,
  UserStatusEnum,
  RoleEnum,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { SepayService } from './sepay.service.js';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto.js';

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  reconciliationStatus?: ReconciliationStatusEnum;
  orderCode?: string | null;
}

@Injectable()
export class PaymentService extends BaseService<IPayment, string> {
  private readonly paymentLogger = new Logger(PaymentService.name);

  constructor(
    protected readonly paymentRepository: PaymentRepository,
    protected readonly orderRepository: OrderRepository,
    protected readonly enrollmentRepository: EnrollmentRepository,
    protected readonly courseRepository: CourseRepository,
    protected readonly userRepository: UserRepository,
    protected readonly sepayService: SepayService,
    protected readonly configService: ConfigService,
    cls: ClsService,
  ) {
    super(paymentRepository, cls, PaymentService.name);
  }

  /**
   * Tạo đơn hàng thanh toán SePay cho học viên
   * Xử lý Choice 3-A: Nếu học viên bấm Mua ngay lần thứ 2 khi đơn cũ đang PENDING (< 15 phút),
   * tái sử dụng đơn hàng cũ còn hạn để tránh sinh rác đơn.
   */
  async createOrder(userId: string, courseId: string): Promise<ICreateOrderResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE) {
      throw new BadRequestException('Tài khoản người dùng không hợp lệ hoặc đã bị vô hiệu hóa');
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }

    if (course.status !== CourseStatusEnum.PUBLISHED) {
      throw new BadRequestException('Khóa học chưa được công khai hoặc chưa được duyệt');
    }

    if (course.instructorId === userId) {
      throw new ConflictException('Bạn là giảng viên tạo khóa học này, bạn đã tự động sở hữu khóa học');
    }

    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    if (existingEnrollment && !existingEnrollment.deletedAt) {
      throw new ConflictException('Bạn đã sở hữu khóa học này');
    }

    if (course.price === 0) {
      throw new BadRequestException('Khóa học này miễn phí, vui lòng đăng ký trực tiếp');
    }

    const bankAccount = this.configService.get<string>('SEPAY_BANK_ACCOUNT', '');
    const bankCode = this.configService.get<string>('SEPAY_BANK_CODE', '');
    const accountName = this.configService.get<string>('SEPAY_ACCOUNT_NAME', '');

    // Kiểm tra đơn hàng PENDING còn hiệu lực (Choice 3-A)
    const activePendingOrder = await this.orderRepository.findPendingOrderByUserAndCourse(userId, courseId);
    if (activePendingOrder && activePendingOrder.expiresAt) {
      this.paymentLogger.log(`Tái sử dụng đơn hàng PENDING còn hiệu lực: ${activePendingOrder.orderCode} cho user: ${userId}`);
      const qrUrl = this.sepayService.generateVietQrUrl({
        bankCode,
        bankAccount,
        amount: activePendingOrder.amount,
        orderCode: activePendingOrder.orderCode,
      });

      return {
        order: {
          id: activePendingOrder.id,
          orderCode: activePendingOrder.orderCode,
          amount: activePendingOrder.amount,
          originalPrice: activePendingOrder.originalPrice || activePendingOrder.amount,
          discountAmount: activePendingOrder.discountAmount || 0,
          status: activePendingOrder.status,
          expiresAt: new Date(activePendingOrder.expiresAt).toISOString(),
        },
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          thumbnailUrl: course.thumbnailUrl,
          price: course.price,
          originalPrice: course.originalPrice,
        },
        paymentInfo: {
          bankAccount,
          bankCode,
          accountName,
          amount: activePendingOrder.amount,
          orderCode: activePendingOrder.orderCode,
          qrUrl,
          expiresAt: new Date(activePendingOrder.expiresAt).toISOString(),
        },
      };
    }

    // Sinh mã đơn hàng mới: Choice 1-B (MD + 5 chữ số)
    const orderCode = await this.sepayService.generateUniqueOrderCode();
    const expireMinutes = this.configService.get<number>('SEPAY_PAYMENT_EXPIRE_MINUTES', 15);
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    const commissionRate = 0.7; // Mặc định 70% doanh thu cho giảng viên
    const instructorEarnings = Math.round(course.price * commissionRate);
    const discountAmount =
      course.originalPrice && course.originalPrice > course.price
        ? course.originalPrice - course.price
        : 0;

    const newOrder = await this.orderRepository.create({
      orderCode,
      userId,
      courseId,
      amount: course.price,
      originalPrice: course.originalPrice || course.price,
      discountAmount,
      paymentMethod: 'SEPAY_BANK_TRANSFER',
      expiresAt,
      instructorCommissionRate: commissionRate,
      instructorEarnings,
      status: OrderStatusEnum.PENDING,
    });

    const qrUrl = this.sepayService.generateVietQrUrl({
      bankCode,
      bankAccount,
      amount: newOrder.amount,
      orderCode: newOrder.orderCode,
    });

    return {
      order: {
        id: newOrder.id,
        orderCode: newOrder.orderCode,
        amount: newOrder.amount,
        originalPrice: newOrder.originalPrice || newOrder.amount,
        discountAmount: newOrder.discountAmount || 0,
        status: newOrder.status,
        expiresAt: expiresAt.toISOString(),
      },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        originalPrice: course.originalPrice,
      },
      paymentInfo: {
        bankAccount,
        bankCode,
        accountName,
        amount: newOrder.amount,
        orderCode: newOrder.orderCode,
        qrUrl,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /**
   * Truy vấn trạng thái đơn hàng (phục vụ Polling từ Frontend)
   * Kiểm tra quyền sở hữu: Chỉ người tạo đơn hoặc Admin mới được xem
   */
  async getOrderStatus(
    userId: string,
    userRole: RoleEnum,
    orderCode: string,
  ): Promise<IOrderStatusResponse> {
    const order = await this.orderRepository.findByOrderCode(orderCode);
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã '${orderCode}'`);
    }

    if (order.userId !== userId && userRole !== RoleEnum.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền truy cập thông tin đơn hàng này');
    }

    let currentStatus = order.status;
    let isExpired = false;

    // Tự động kiểm tra và cập nhật trạng thái nếu đơn PENDING bị quá hạn
    if (order.status === OrderStatusEnum.PENDING && order.expiresAt) {
      if (new Date(order.expiresAt) < new Date()) {
        currentStatus = OrderStatusEnum.EXPIRED;
        isExpired = true;
        await this.orderRepository.updateOrderStatus(order.id, OrderStatusEnum.EXPIRED);
      }
    } else if (order.status === OrderStatusEnum.EXPIRED) {
      isExpired = true;
    }

    const course = await this.courseRepository.findById(order.courseId);

    const bankAccount = this.configService.get<string>('SEPAY_BANK_ACCOUNT', '');
    const bankCode = this.configService.get<string>('SEPAY_BANK_CODE', '');
    const accountName = this.configService.get<string>('SEPAY_ACCOUNT_NAME', '');

    let paymentInfo: IOrderStatusResponse['paymentInfo'] | undefined;
    if (currentStatus === OrderStatusEnum.PENDING) {
      paymentInfo = {
        bankAccount,
        bankCode,
        accountName,
        amount: order.amount,
        orderCode: order.orderCode,
        qrUrl: this.sepayService.generateVietQrUrl({
          bankCode,
          bankAccount,
          amount: order.amount,
          orderCode: order.orderCode,
        }),
      };
    }

    return {
      orderCode: order.orderCode,
      status: currentStatus,
      amount: order.amount,
      courseId: order.courseId,
      isPaid: currentStatus === OrderStatusEnum.PAID,
      isExpired,
      expiresAt: order.expiresAt ? new Date(order.expiresAt).toISOString() : '',
      paidAt: order.paidAt ? new Date(order.paidAt).toISOString() : null,
      course,
      paymentInfo,
    };
  }

  /**
   * Xử lý Webhook SePay gửi sang
   * Xác thực chữ ký HMAC-SHA256, kiểm tra tính toàn vẹn và kích hoạt sở hữu khóa học
   */
  async processSepayWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string | undefined,
    payload: SepayWebhookDto,
  ): Promise<WebhookProcessResult> {
    // 1. Xác thực HMAC-SHA256 bắt buộc
    this.sepayService.verifyWebhookSignature(headers, rawBody);

    const sepayTxId = String(payload.id);
    const transferAmount = Number(payload.transferAmount) || 0;
    const transferType = String(payload.transferType || '').toLowerCase();
    const content = String(payload.content || '');
    const accountNumber = String(payload.accountNumber || '');

    this.paymentLogger.log(`Đã nhận SePay Webhook - Giao dịch #${sepayTxId}: ${transferAmount}đ, Loại: ${transferType}`);

    // 2. Kiểm tra transferType
    if (transferType !== 'in') {
      this.paymentLogger.log(`Bỏ qua giao dịch tiền ra (transferType: ${transferType})`);
      return {
        success: true,
        message: 'Bỏ qua giao dịch tiền ra',
      };
    }

    // 3. Kiểm tra số tài khoản nhận nếu có cấu hình
    const configuredAccount = this.configService.get<string>('SEPAY_BANK_ACCOUNT')?.trim();
    if (configuredAccount && accountNumber !== configuredAccount) {
      this.paymentLogger.warn(`Số tài khoản nhận (${accountNumber}) không khớp cấu hình (${configuredAccount})`);
      await this.saveReconciliationPayment({
        sepayTxId,
        amountIn: transferAmount,
        bankBrandName: payload.gateway || '',
        accountNumber,
        transactionDate: payload.transactionDate,
        content,
        reconciliationStatus: ReconciliationStatusEnum.INVALID_ACCOUNT,
        rawPayload: payload as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        message: 'Số tài khoản nhận không khớp cấu hình',
        reconciliationStatus: ReconciliationStatusEnum.INVALID_ACCOUNT,
      };
    }

    // 4. Kiểm tra Idempotency chống xử lý trùng lặp Webhook
    const existingPayment = await this.paymentRepository.findBySepayTransactionId(sepayTxId);
    if (existingPayment) {
      this.paymentLogger.log(`Giao dịch SePay #${sepayTxId} đã từng được xử lý trước đó (Idempotent OK)`);
      return {
        success: true,
        message: 'Giao dịch đã được ghi nhận trước đó',
        reconciliationStatus: existingPayment.reconciliationStatus,
        orderCode: existingPayment.orderCode,
      };
    }

    // 5. Trích xuất mã đơn hàng từ `code` hoặc `content`
    const prefix = this.configService.get<string>('SEPAY_PAYMENT_PREFIX', 'MD').trim();
    const regexPattern = new RegExp(`${prefix}\\d{5}`, 'i');
    const matchedCode = content.match(regexPattern);
    const orderCode = payload.code?.trim() || (matchedCode ? matchedCode[0].toUpperCase() : null);

    if (!orderCode) {
      this.paymentLogger.warn(`Không nhận diện được mã đơn hàng ${prefix}XXXXX từ nội dung: "${content}"`);
      await this.saveReconciliationPayment({
        sepayTxId,
        amountIn: transferAmount,
        bankBrandName: payload.gateway || '',
        accountNumber,
        transactionDate: payload.transactionDate,
        content,
        reconciliationStatus: ReconciliationStatusEnum.UNMATCHED_ORDER,
        rawPayload: payload as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        message: 'Không tìm thấy mã thanh toán phù hợp trong nội dung chuyển khoản',
        reconciliationStatus: ReconciliationStatusEnum.UNMATCHED_ORDER,
      };
    }

    // 6. Tìm đơn hàng tương ứng trong CSDL
    const order = await this.orderRepository.findByOrderCode(orderCode);
    if (!order) {
      this.paymentLogger.warn(`Không tìm thấy đơn hàng mã '${orderCode}' trong database`);
      await this.saveReconciliationPayment({
        orderCode,
        sepayTxId,
        amountIn: transferAmount,
        bankBrandName: payload.gateway || '',
        accountNumber,
        transactionDate: payload.transactionDate,
        content,
        reconciliationStatus: ReconciliationStatusEnum.UNMATCHED_ORDER,
        rawPayload: payload as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        message: `Không tìm thấy đơn hàng với mã '${orderCode}'`,
        reconciliationStatus: ReconciliationStatusEnum.UNMATCHED_ORDER,
        orderCode,
      };
    }

    // 7. Kiểm tra trạng thái đơn hàng
    if (order.status === OrderStatusEnum.PAID) {
      this.paymentLogger.log(`Đơn hàng '${orderCode}' đã ở trạng thái PAID trước đó`);
      await this.saveReconciliationPayment({
        orderId: order.id,
        orderCode,
        sepayTxId,
        amountIn: transferAmount,
        bankBrandName: payload.gateway || '',
        accountNumber,
        transactionDate: payload.transactionDate,
        content,
        reconciliationStatus: ReconciliationStatusEnum.MATCHED,
        rawPayload: payload as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        message: 'Đơn hàng đã được thanh toán trước đó',
        reconciliationStatus: ReconciliationStatusEnum.MATCHED,
        orderCode,
      };
    }

    const isOrderExpired =
      order.status === OrderStatusEnum.EXPIRED ||
      (order.expiresAt && new Date(order.expiresAt) < new Date());

    if (isOrderExpired) {
      this.paymentLogger.warn(`Đơn hàng '${orderCode}' đã hết hạn thanh toán`);
      await this.saveReconciliationPayment({
        orderId: order.id,
        orderCode,
        sepayTxId,
        amountIn: transferAmount,
        bankBrandName: payload.gateway || '',
        accountNumber,
        transactionDate: payload.transactionDate,
        content,
        reconciliationStatus: ReconciliationStatusEnum.EXPIRED_ORDER,
        rawPayload: payload as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        message: 'Đơn hàng đã hết hạn thanh toán',
        reconciliationStatus: ReconciliationStatusEnum.EXPIRED_ORDER,
        orderCode,
      };
    }

    // 8. Kiểm tra số tiền thanh toán
    if (transferAmount < order.amount) {
      this.paymentLogger.warn(
        `Thanh toán thiếu tiền cho đơn hàng '${orderCode}': nhận ${transferAmount}đ < cần ${order.amount}đ`,
      );
      await this.saveReconciliationPayment({
        orderId: order.id,
        orderCode,
        sepayTxId,
        amountIn: transferAmount,
        bankBrandName: payload.gateway || '',
        accountNumber,
        transactionDate: payload.transactionDate,
        content,
        reconciliationStatus: ReconciliationStatusEnum.UNDERPAID,
        rawPayload: payload as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        message: 'Số tiền chuyển khoản thiếu so với giá trị đơn hàng',
        reconciliationStatus: ReconciliationStatusEnum.UNDERPAID,
        orderCode,
      };
    }

    // 9. Lựa chọn 2-A: Nếu chuyển thừa tiền (transferAmount > order.amount),
    // kích hoạt đơn hàng và ghi nhận cờ OVERPAID
    const reconciliationStatus =
      transferAmount > order.amount
        ? ReconciliationStatusEnum.OVERPAID
        : ReconciliationStatusEnum.MATCHED;

    // 10. Kích hoạt giao dịch toàn vẹn bằng MongoDB Session Transaction
    await this.executeActivationTransaction({
      order,
      sepayTxId,
      transferAmount,
      gateway: payload.gateway || '',
      accountNumber,
      transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
      content,
      reconciliationStatus,
      rawPayload: payload as unknown as Record<string, unknown>,
    });

    this.paymentLogger.log(
      `Đã kích hoạt thành công đơn hàng '${orderCode}' và cấp quyền học cho User '${order.userId}'`,
    );

    return {
      success: true,
      message: 'Xác thực thanh toán và kích hoạt quyền học thành công',
      reconciliationStatus,
      orderCode,
    };
  }

  /**
   * Kích hoạt quyền học viên và ghi nhận thanh toán trong một ClientSession Transaction
   * Có cơ chế fallback tự động an toàn nếu môi trường không hỗ trợ Replica Set
   */
  private async executeActivationTransaction(params: {
    order: IOrder;
    sepayTxId: string;
    transferAmount: number;
    gateway: string;
    accountNumber: string;
    transactionDate: Date;
    content: string;
    reconciliationStatus: ReconciliationStatusEnum;
    rawPayload: Record<string, unknown>;
  }): Promise<void> {
    const {
      order,
      sepayTxId,
      transferAmount,
      gateway,
      accountNumber,
      transactionDate,
      content,
      reconciliationStatus,
      rawPayload,
    } = params;

    const executeOperation = async (session?: ClientSession) => {
      // 1. Lưu bản ghi Payment
      await this.paymentRepository.create(
        {
          orderId: order.id,
          orderCode: order.orderCode,
          sepayTransactionId: sepayTxId,
          amountIn: transferAmount,
          bankBrandName: gateway,
          accountNumber,
          transactionDate,
          content,
          reconciliationStatus,
          rawPayload,
        },
        session,
      );

      // 2. Cập nhật trạng thái Order = PAID
      await this.orderRepository.updateOrderStatus(
        order.id,
        OrderStatusEnum.PAID,
        {
          paidAt: new Date(),
        },
        session,
      );

      // 3. Kiểm tra và tạo Enrollment
      const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(
        order.userId,
        order.courseId,
        session,
      );

      if (!existingEnrollment || existingEnrollment.deletedAt) {
        await this.enrollmentRepository.create(
          {
            userId: order.userId,
            courseId: order.courseId,
            orderId: order.id,
            enrolledAt: new Date(),
          },
          session,
        );
      }
    };

    try {
      await this.enrollmentRepository.withTransaction(async (session) => {
        await executeOperation(session);
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('replica set') ||
        errMsg.includes('Transaction numbers are only allowed')
      ) {
        this.paymentLogger.warn(
          'MongoDB chạy chế độ standalone không hỗ trợ session transaction, thực thi tuần tự fallback',
        );
        await executeOperation();
      } else {
        this.paymentLogger.error(`Lỗi khi thực thi transaction kích hoạt đơn hàng: ${errMsg}`);
        throw err;
      }
    }
  }

  /**
   * Lưu bản ghi thanh toán đối soát khi xảy ra lỗi/không khớp
   */
  private async saveReconciliationPayment(params: {
    orderId?: string | null;
    orderCode?: string | null;
    sepayTxId: string;
    amountIn: number;
    bankBrandName: string;
    accountNumber: string;
    transactionDate?: string | Date;
    content: string;
    reconciliationStatus: ReconciliationStatusEnum;
    rawPayload?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.paymentRepository.create({
        orderId: params.orderId || null,
        orderCode: params.orderCode || null,
        sepayTransactionId: params.sepayTxId,
        amountIn: params.amountIn,
        bankBrandName: params.bankBrandName,
        accountNumber: params.accountNumber,
        transactionDate: params.transactionDate ? new Date(params.transactionDate) : new Date(),
        content: params.content,
        reconciliationStatus: params.reconciliationStatus,
        rawPayload: params.rawPayload || {},
      });
    } catch (err: unknown) {
      this.paymentLogger.error(
        `Không thể lưu bản ghi Payment đối soát cho SePay #${params.sepayTxId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
