export declare class ReconciliationQueryDto {
    page: number;
    limit: number;
}
export declare class ReprocessPaymentDto {
    orderCode?: string;
    note: string;
}
export declare class ResolvePaymentDto {
    type: 'ACKNOWLEDGED' | 'REFUNDED';
    note: string;
    bankReference?: string;
    refundedAmount?: number;
}
