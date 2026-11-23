import 'reflect-metadata';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { PaymentSchema } from '../schemas/payment.schema.js';
import { calculateOrderFinancials } from '../utils/order-pricing.util.js';
import { assertFreeEnrollmentAllowed } from '../../enrollment/utils/free-enrollment.util.js';

const Payment = mongoose.model('InternalPaymentValidationTest', PaymentSchema);
const internal = () => ({
  source: 'INTERNAL_SEED', internalReference: 'batch:pair', seedBatch: 'batch',
  orderId: new mongoose.Types.ObjectId(), orderCode: 'MD123456ABCD', amountIn: 2000,
  transactionDate: new Date(), appliedAt: new Date(), reconciliationStatus: 'MATCHED',
});
describe('Explicit internal payment provenance', () => {
  it('accepts internal history without fabricating a SePay ID or verified bank receipt', async () => {
    await expect(new Payment(internal()).validate()).resolves.toBeUndefined();
  });
  it('still requires SePay identifiers for live and legacy receipts', async () => {
    await expect(new Payment({ amountIn: 2000 }).validate()).rejects.toThrow('sepayTransactionId');
    await expect(new Payment({ amountIn: 2000, sepayTransactionId: '123' }).validate()).resolves.toBeUndefined();
  });
  it.each(['sepayTransactionId', 'verifiedAt', 'payloadHash', 'accountNumber', 'bankBrandName'])('rejects fake bank evidence on internal history: %s', async (field) => {
    const value = field === 'verifiedAt' ? new Date() : 'fabricated';
    await expect(new Payment({ ...internal(), [field]: value }).validate()).rejects.toThrow('cannot contain bank');
  });
  it.each(['internalReference', 'seedBatch', 'orderId', 'orderCode', 'appliedAt', 'transactionDate'])('requires complete seed references: %s', async (field) => {
    await expect(new Payment({ ...internal(), [field]: undefined }).validate()).rejects.toThrow();
  });
  it('rejects a zero-amount internal payment for a free enrollment', async () => {
    await expect(new Payment({ ...internal(), amountIn: 0 }).validate()).rejects.toThrow('Free enrollment');
  });
});
describe('Shared enrollment and VND snapshot rules', () => {
  it('retains checkout rounding and preserves gross = platform + instructor', () => {
    expect(calculateOrderFinancials(5, 10, 30)).toEqual({
      amount: 5, originalPrice: 10, discountAmount: 5, platformCommissionRate: 30,
      platformEarnings: 2, instructorCommissionRate: 0.7, instructorEarnings: 3,
    });
    expect(calculateOrderFinancials(2000, null, 0).platformEarnings).toBe(0);
    expect(calculateOrderFinancials(2000, 1000, 100).instructorEarnings).toBe(0);
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid paid prices: %s', price => {
    expect(() => calculateOrderFinancials(price, null, 30)).toThrow();
  });
  it('only permits the existing free-registration conditions', () => {
    const user = { status: 'active' }, course = { status: 'published', price: 0, instructorId: 'teacher' };
    expect(() => assertFreeEnrollmentAllowed('student', 'course', user, course)).not.toThrow();
    expect(() => assertFreeEnrollmentAllowed('student', 'course', user, { ...course, price: 1 })).toThrow('Chỉ được đăng ký');
    expect(() => assertFreeEnrollmentAllowed('teacher', 'course', user, course)).toThrow('khóa học của chính mình');
    expect(() => assertFreeEnrollmentAllowed('student', 'course', { ...user, deletedAt: new Date() }, course)).toThrow('vô hiệu hóa');
  });
});
