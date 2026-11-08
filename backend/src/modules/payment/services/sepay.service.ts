import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly orderRepository: OrderRepository,
  ) {}

  /**
   * Xác thực chữ ký HMAC-SHA256 từ SePay Webhook
   * @param headers Request headers chứa X-SePay-Signature và X-SePay-Timestamp
   * @param rawBody Buffer raw body nguyên vẹn từ request
   */
  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string | undefined): boolean {
    const signatureHeader =
      (headers['x-sepay-signature'] as string) ||
      (headers['X-SePay-Signature'] as string) ||
      '';

    const timestampHeader =
      (headers['x-sepay-timestamp'] as string) ||
      (headers['X-SePay-Timestamp'] as string) ||
      '';

    if (!signatureHeader || !timestampHeader) {
      throw new UnauthorizedException('Thiếu header xác thực SePay Webhook (X-SePay-Signature hoặc X-SePay-Timestamp)');
    }

    if (!rawBody) {
      throw new UnauthorizedException('Không tìm thấy raw body của request để xác thực HMAC');
    }

    const timestampNumber = Number.parseInt(timestampHeader, 10);
    if (Number.isNaN(timestampNumber)) {
      throw new UnauthorizedException('X-SePay-Timestamp không hợp lệ');
    }

    // SePay timestamp có thể dạng giây (10 số) hoặc mili-giây (13 số)
    const timestampInSeconds = timestampNumber > 1e11 ? Math.floor(timestampNumber / 1000) : timestampNumber;
    const currentSeconds = Math.floor(Date.now() / 1000);

    // Kiểm tra độ lệch thời gian không quá 300 giây (5 phút)
    if (Math.abs(currentSeconds - timestampInSeconds) > 300) {
      throw new UnauthorizedException('Yêu cầu Webhook đã hết hạn (Timestamp sai lệch quá 300 giây)');
    }

    const secret = this.configService.get<string>('SEPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('SEPAY_WEBHOOK_SECRET chưa được cấu hình trong hệ thống');
      throw new UnauthorizedException('Hệ thống chưa cấu hình Secret Key cho SePay Webhook');
    }

    const rawBodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const dataToSign = `${timestampHeader}.${rawBodyBuffer.toString('utf8')}`;

    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Chữ ký SePay có định dạng sha256={hash}
    const expectedSignature = `sha256=${calculatedHmac}`;

    // Chuẩn hóa signature nhận được (nếu webhook gửi có hoặc không có prefix sha256=)
    const normalizedReceived = signatureHeader.startsWith('sha256=')
      ? signatureHeader
      : `sha256=${signatureHeader}`;

    const receivedBuf = Buffer.from(normalizedReceived);
    const expectedBuf = Buffer.from(expectedSignature);

    if (
      receivedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      this.logger.warn(`Xác thực chữ ký HMAC thất bại. Received: ${signatureHeader}`);
      throw new UnauthorizedException('Chữ ký HMAC-SHA256 của Webhook không hợp lệ');
    }

    return true;
  }

  /**
   * Sinh mã thanh toán duy nhất với tiền tố cấu hình (mặc định MD)
   * và hậu tố 5 chữ số ngẫu nhiên (Lựa chọn B của người dùng)
   */
  async generateUniqueOrderCode(): Promise<string> {
    const prefix = this.configService.get<string>('SEPAY_PAYMENT_PREFIX', 'MD').trim();
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Sinh 5 chữ số ngẫu nhiên từ 10000 đến 99999
      const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
      const candidateCode = `${prefix}${randomDigits}`;

      const existing = await this.orderRepository.findByOrderCode(candidateCode);
      if (!existing) {
        return candidateCode;
      }
    }

    // Trường hợp xấu nhất sau 5 lần va chạm: dùng thêm timestamp slice
    const fallbackSuffix = Date.now().toString().slice(-5);
    return `${prefix}${fallbackSuffix}`;
  }

  /**
   * Tạo URL VietQR chuẩn SePay
   */
  generateVietQrUrl(params: {
    bankCode: string;
    bankAccount: string;
    amount: number;
    orderCode: string;
  }): string {
    const { bankCode, bankAccount, amount, orderCode } = params;
    const encodedDes = encodeURIComponent(orderCode);
    return `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankCode}&amount=${amount}&des=${encodedDes}&template=compact`;
  }
}

