import { describe, it, expect } from 'vitest';
import {
  formatTransactionPeriodRange,
  TRANSACTION_PERIOD_OPTIONS,
} from '../components/transaction-time-filter';

describe('formatTransactionPeriodRange', () => {
  it('should format custom date range when both startDate and endDate are provided', () => {
    const formatted = formatTransactionPeriodRange('custom', '2026-11-01', '2026-11-20');
    expect(formatted).toBe('Tùy chỉnh: 2026-11-01 – 2026-11-20');
  });

  it('should format custom placeholder when dates are missing', () => {
    const formatted = formatTransactionPeriodRange('custom');
    expect(formatted).toBe('Tùy chỉnh khoảng ngày');
  });

  it('should format today date range', () => {
    const formatted = formatTransactionPeriodRange('today');
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
    expect(formatted).toBe(expected);
  });

  it('should format yesterday date range', () => {
    const formatted = formatTransactionPeriodRange('yesterday');
    const y = new Date(Date.now() - 86400000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${pad(y.getDate())}/${pad(y.getMonth() + 1)}/${y.getFullYear()}`;
    expect(formatted).toBe(expected);
  });

  it('should format 7days and 7d date range', () => {
    const f7days = formatTransactionPeriodRange('7days');
    const f7d = formatTransactionPeriodRange('7d');
    expect(f7days).toContain('–');
    expect(f7d).toBe(f7days);
  });

  it('should format 30days and 30d date range', () => {
    const f30days = formatTransactionPeriodRange('30days');
    const f30d = formatTransactionPeriodRange('30d');
    expect(f30days).toContain('–');
    expect(f30d).toBe(f30days);
  });

  it('should format thismonth date range starting from 01', () => {
    const formatted = formatTransactionPeriodRange('thismonth');
    expect(formatted.startsWith('01/')).toBe(true);
    expect(formatted).toContain('–');
  });

  it('should format lastmonth date range correctly', () => {
    const formatted = formatTransactionPeriodRange('lastmonth');
    expect(formatted.startsWith('01/')).toBe(true);
    expect(formatted).toContain('–');
  });

  it('should format thisyear date range starting from 01/01', () => {
    const formatted = formatTransactionPeriodRange('thisyear');
    const year = new Date().getFullYear();
    expect(formatted.startsWith(`01/01/${year}`)).toBe(true);
  });

  it('should format all to Toàn bộ thời gian', () => {
    const formatted = formatTransactionPeriodRange('all');
    expect(formatted).toBe('Toàn bộ thời gian');
  });
});

describe('TRANSACTION_PERIOD_OPTIONS', () => {
  it('should contain all required options matching the dashboard header filters', () => {
    const optionValues = TRANSACTION_PERIOD_OPTIONS.map((opt) => opt.value);
    expect(optionValues).toContain('today');
    expect(optionValues).toContain('yesterday');
    expect(optionValues).toContain('7days');
    expect(optionValues).toContain('30days');
    expect(optionValues).toContain('thismonth');
    expect(optionValues).toContain('lastmonth');
    expect(optionValues).toContain('thisyear');
    expect(optionValues).toContain('all');
    expect(optionValues).toContain('custom');
  });
});
