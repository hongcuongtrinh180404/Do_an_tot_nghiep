import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OrderStatusEnum, ReconciliationStatusEnum, type IOrderStatusResponse, type ICheckoutOrderResponse } from 'share-lib';
import { calculateSecondsRemaining, formatCountdown, getCurrentPaymentInfo, getOrderPollInterval, shouldCheckExpiry } from '../utils/checkout.util';

function status(state = OrderStatusEnum.PENDING): IOrderStatusResponse {
  return {
    orderCode: 'MD7K2P9X4A6B', status: state, amount: 100000, courseId: 'course',
    isPaid: state === OrderStatusEnum.PAID, isExpired: state === OrderStatusEnum.EXPIRED,
    expiresAt: new Date(Date.now() + 900000).toISOString(), serverTime: new Date().toISOString(), receivedAmount: 0,
  };
}

describe('Checkout countdown and polling (production helpers)', () => {
  it('formats remaining time and invalid values', () => {
    assert.equal(formatCountdown(900), '15:00');
    assert.equal(formatCountdown(545), '09:05');
    assert.equal(formatCountdown(0), '00:00');
    assert.equal(formatCountdown(-1), '00:00');
    assert.equal(formatCountdown(NaN), '00:00');
  });

  it('does not expire early in the final fractional second', () => {
    const now = Date.now();
    assert.equal(calculateSecondsRemaining(new Date(now + 250).toISOString(), now), 1);
    assert.equal(calculateSecondsRemaining(new Date(now - 1).toISOString(), now), 0);
  });

  it('uses server clock offset rather than trusting a fast client clock', () => {
    const serverNow = Date.now();
    const clientNow = serverNow + 600000;
    assert.equal(calculateSecondsRemaining(new Date(serverNow + 900000).toISOString(), clientNow, serverNow - clientNow), 900);
    assert.equal(calculateSecondsRemaining('invalid', clientNow), 0);
  });

  it('only requests a final expiry check once per order/deadline', () => {
    let checkedKey: string | null = null;
    let requests = 0;
    for (let tick = 0; tick < 10; tick++) {
      if (shouldCheckExpiry('order:deadline', 0, checkedKey)) {
        requests++; checkedKey = 'order:deadline';
      }
    }
    assert.equal(requests, 1);
    assert.equal(shouldCheckExpiry('other:deadline', 0, checkedKey), true);
    assert.equal(shouldCheckExpiry('other:deadline', 1, checkedKey), false);
  });

  it('polls only pending orders', () => {
    assert.equal(getOrderPollInterval({ data: status() }), 3000);
    for (const state of [OrderStatusEnum.PAID, OrderStatusEnum.CANCELLED, OrderStatusEnum.EXPIRED]) {
      assert.equal(getOrderPollInterval({ data: status(state) }), false);
    }
  });

  it('stops polling on permanent HTTP failures or when reconciliation is needed', () => {
    for (const code of [401, 403, 404]) assert.equal(getOrderPollInterval({ error: { response: { status: code } } }), false);
    assert.equal(getOrderPollInterval({ data: { ...status(), reconciliationStatus: ReconciliationStatusEnum.EXPIRED_ORDER } }), false);
    assert.equal(getOrderPollInterval({ data: { ...status(), reconciliationStatus: ReconciliationStatusEnum.UNDERPAID } }), 3000);
  });

  it('backs off temporary failures, caps delay, and resumes normal polling after success', () => {
    assert.equal(getOrderPollInterval({ error: new Error('offline'), errorUpdateCount: 1 }), 6000);
    assert.equal(getOrderPollInterval({ error: new Error('offline'), errorUpdateCount: 3 }), 24000);
    assert.equal(getOrderPollInterval({ error: new Error('offline'), errorUpdateCount: 10 }), 30000);
    assert.equal(getOrderPollInterval({ data: status(), errorUpdateCount: 10 }), 3000);
  });

  it('hides stale/full-price QR after a partial payment and never shows QR for terminal orders', () => {
    const checkout: ICheckoutOrderResponse = {
      ...status(), originalPrice: 100000, discountAmount: 0, course: null,
      paymentInfo: { bankAccount: '123456', bankCode: 'MB', accountName: 'TEST', amount: 100000, orderCode: 'MD7K2P9X4A6B', qrUrl: 'https://qr.sepay.vn/img' },
    };
    assert.equal(getCurrentPaymentInfo(checkout, status())?.amount, 100000);
    assert.equal(getCurrentPaymentInfo(checkout, { ...status(), receivedAmount: 40000 }), undefined);
    for (const state of [OrderStatusEnum.PAID, OrderStatusEnum.CANCELLED, OrderStatusEnum.EXPIRED]) {
      assert.equal(getCurrentPaymentInfo(checkout, status(state)), undefined);
    }
    assert.equal(getCurrentPaymentInfo(checkout, { ...status(), reconciliationStatus: ReconciliationStatusEnum.INVALID_ACCOUNT }), undefined);
    checkout.paymentInfo!.amount = 60000;
    assert.equal(getCurrentPaymentInfo(checkout, { ...status(), receivedAmount: 40000 })?.amount, 60000);
  });
});
