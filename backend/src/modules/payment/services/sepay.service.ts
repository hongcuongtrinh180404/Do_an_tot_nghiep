import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { PAYMENT_CONSTANTS, type IOrderBankSnapshot } from 'share-lib';

export interface SepayPaymentConfiguration extends IOrderBankSnapshot {
  expireMinutes: number;
}

@Injectable()
export class SepayService {
  constructor(private readonly configService: ConfigService) {}

  getPaymentConfiguration(): SepayPaymentConfiguration {
    const bankAccount = this.configService.get<string>('SEPAY_BANK_ACCOUNT', '').trim();
    const bankCode = this.configService.get<string>('SEPAY_BANK_CODE', '').trim().toUpperCase();
    const accountName = this.configService.get<string>('SEPAY_ACCOUNT_NAME', '').trim();
    const secret = this.configService.get<string>('SEPAY_WEBHOOK_SECRET', '');
    const prefix = this.configService.get<string>('SEPAY_PAYMENT_PREFIX', 'MD').trim().toUpperCase();
    const expireMinutes = Number(this.configService.get('SEPAY_PAYMENT_EXPIRE_MINUTES', 15));

    if (
      !/^[A-Z0-9]{1,64}$/i.test(bankAccount) ||
      !/^[A-Z0-9]{2,20}$/.test(bankCode) ||
      !accountName || secret.length < 32 || prefix !== PAYMENT_CONSTANTS.ORDER_PREFIX ||
      !Number.isInteger(expireMinutes) || expireMinutes < 1 || expireMinutes > 1440
    ) {
      throw new ServiceUnavailableException('Thanh toán SePay chưa được cấu hình hợp lệ. Vui lòng liên hệ quản trị viên');
    }

    return { bankAccount, bankCode, accountName, expireMinutes };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string | undefined,
  ): boolean {
    const signature = headers['x-sepay-signature'] ?? headers['X-SePay-Signature'];
    const timestamp = headers['x-sepay-timestamp'] ?? headers['X-SePay-Timestamp'];
    if (typeof signature !== 'string' || typeof timestamp !== 'string') {
      throw new UnauthorizedException('Thiếu hoặc trùng header xác thực SePay Webhook');
    }
    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Không tìm thấy raw body nguyên vẹn để xác thực HMAC');
    }
    if (!/^\d{10}(?:\d{3})?$/.test(timestamp)) {
      throw new UnauthorizedException('X-SePay-Timestamp không hợp lệ');
    }

    const timestampNumber = Number(timestamp);
    const timestampSeconds = timestamp.length === 13 ? timestampNumber / 1000 : timestampNumber;
    if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
      throw new UnauthorizedException('Yêu cầu Webhook đã hết hạn');
    }

    const secret = this.configService.get<string>('SEPAY_WEBHOOK_SECRET', '');
    if (secret.length < 32) {
      throw new UnauthorizedException('Hệ thống chưa cấu hình Secret Key hợp lệ cho SePay Webhook');
    }
    const hash = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      throw new UnauthorizedException('Chữ ký HMAC-SHA256 không hợp lệ');
    }

    const expected = crypto.createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest();
    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), expected)) {
      throw new UnauthorizedException('Chữ ký HMAC-SHA256 của Webhook không hợp lệ');
    }
    return true;
  }

  // Uniqueness is enforced at INSERT, not by a race-prone SELECT before INSERT.
  generateOrderCode(): string {
    const { ORDER_PREFIX, ORDER_SUFFIX_LENGTH, ORDER_ALPHABET } = PAYMENT_CONSTANTS;
    let suffix: string;
    do {
      suffix = Array.from({ length: ORDER_SUFFIX_LENGTH }, () =>
        ORDER_ALPHABET[crypto.randomInt(ORDER_ALPHABET.length)],
      ).join('');
    } while (!/[A-Z]/.test(suffix) || !/\d/.test(suffix));
    return `${ORDER_PREFIX}${suffix}`;
  }

  normalizeOrderCode(value: string): string | null {
    const code = value.trim().toUpperCase();
    return PAYMENT_CONSTANTS.ORDER_CODE_PATTERN.test(code) || PAYMENT_CONSTANTS.LEGACY_ORDER_CODE_PATTERN.test(code)
      ? code : null;
  }

  extractOrderCode(code: string | null | undefined, content: string): string | null {
    const provided = code ? this.normalizeOrderCode(code) : null;
    // Do not match a short legacy code inside a new/longer token; reject ambiguous memos.
    const matches = content.toUpperCase().match(/(?<![A-Z0-9])MD(?:[A-Z0-9]{10}|\d{5})(?![A-Z0-9])/g) ?? [];
    const candidates = new Set(matches);
    if (provided) candidates.add(provided);
    return candidates.size === 1 ? [...candidates][0] : null;
  }

  generateVietQrUrl(params: { bankCode: string; bankAccount: string; amount: number; orderCode: string }): string {
    const query = new URLSearchParams({
      acc: params.bankAccount,
      bank: params.bankCode,
      amount: String(params.amount),
      des: params.orderCode,
      template: 'compact',
    });
    return `https://qr.sepay.vn/img?${query.toString()}`;
  }
}
