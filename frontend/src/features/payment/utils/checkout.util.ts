import { OrderStatusEnum, ReconciliationStatusEnum, type IOrderStatusResponse, type ICheckoutOrderResponse } from 'share-lib';

export function formatCountdown(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function calculateSecondsRemaining(expiresAt: string, now: number, clockOffsetMs = 0): number {
  const difference = new Date(expiresAt).getTime() - now - clockOffsetMs;
  return Number.isFinite(difference) ? Math.max(0, Math.ceil(difference / 1000)) : 0;
}

export function shouldCheckExpiry(key: string, seconds: number, lastCheckedKey: string | null): boolean {
  return seconds === 0 && key !== lastCheckedKey;
}

export function isFatalPaymentError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 401 || status === 403 || status === 404;
}

export function requiresPaymentReview(status?: ReconciliationStatusEnum): boolean {
  return status !== undefined && ![
    ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID, ReconciliationStatusEnum.UNDERPAID,
  ].includes(status);
}

export function getCurrentPaymentInfo(checkout: ICheckoutOrderResponse, status: IOrderStatusResponse) {
  const amountDue = Math.max(0, status.amount - status.receivedAmount);
  return status.status === OrderStatusEnum.PENDING && !requiresPaymentReview(status.reconciliationStatus) &&
    amountDue > 0 && checkout.paymentInfo?.amount === amountDue ? checkout.paymentInfo : undefined;
}

export function getOrderPollInterval(state: {
  data?: IOrderStatusResponse;
  error?: unknown;
  fetchFailureCount?: number;
  errorUpdateCount?: number;
}): number | false {
  if (
    (state.data && state.data.status !== OrderStatusEnum.PENDING) ||
    requiresPaymentReview(state.data?.reconciliationStatus) || isFatalPaymentError(state.error)
  ) return false;
  if (state.error) {
    const failures = Math.max(1, state.fetchFailureCount ?? 0, state.errorUpdateCount ?? 0);
    return Math.min(30000, 3000 * 2 ** Math.min(failures, 4));
  }
  return 3000;
}
