import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AxiosAdapter } from 'axios';
import { apiClient } from '../../../lib/api-client';
import { paymentApi } from '../api/payment.api';
import { enrollmentApi } from '../../course/api/enrollment.api';

describe('Payment client API routing', () => {
  const originalAdapter = apiClient.defaults.adapter;
  afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

  it('creates server-priced orders and separates checkout details from lightweight status', async () => {
    const calls: Array<{ url?: string; body: unknown }> = [];
    apiClient.defaults.adapter = (async (config) => {
      calls.push({ url: config.url, body: config.data ? JSON.parse(config.data as string) : undefined });
      return { data: { data: { ok: true } }, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    await paymentApi.createOrder('course');
    await paymentApi.getCheckoutOrder('MD7K2P9X4A6B');
    await paymentApi.getOrderStatus('MD7K2P9X4A6B');
    assert.deepEqual(calls, [
      { url: '/payments/create-order', body: { courseId: 'course' } },
      { url: '/payments/orders/MD7K2P9X4A6B', body: undefined },
      { url: '/payments/order-status/MD7K2P9X4A6B', body: undefined },
    ]);
  });

  it('registers free courses without calling any payment/purchase bypass', async () => {
    let url: string | undefined;
    apiClient.defaults.adapter = (async (config) => {
      url = config.url;
      return { data: { data: { id: 'enrollment', orderId: null } }, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    assert.equal((await enrollmentApi.registerFreeCourse('course')).orderId, null);
    assert.equal(url, '/enrollments/register-free');
    assert.equal(Object.hasOwn(enrollmentApi, 'mockPurchase'), false);
  });
});
