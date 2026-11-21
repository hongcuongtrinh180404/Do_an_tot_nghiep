import { ConfigService } from '@nestjs/config';
import { type IOrderBankSnapshot } from 'share-lib';
export interface SepayPaymentConfiguration extends IOrderBankSnapshot {
    expireMinutes: number;
}
export declare class SepayService {
    private readonly configService;
    constructor(configService: ConfigService);
    getPaymentConfiguration(): SepayPaymentConfiguration;
    verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string | undefined): boolean;
    generateOrderCode(): string;
    normalizeOrderCode(value: string): string | null;
    extractOrderCode(code: string | null | undefined, content: string): string | null;
    generateVietQrUrl(params: {
        bankCode: string;
        bankAccount: string;
        amount: number;
        orderCode: string;
    }): string;
}
