import { describe, it, expect } from 'vitest';
import { getTransactionStatusInfo } from '../components/transaction-table';
import type { IRevenueTransactionItem } from 'share-lib';

describe('TransactionTable getTransactionStatusInfo', () => {
  it('should return MATCHED status when reconciliationStatus is MATCHED', () => {
    const tx: IRevenueTransactionItem = {
      id: '1',
      orderCode: 'ORD-001',
      courseTitle: 'React 19',
      studentName: 'Nguyen Van A',
      instructorName: 'Tran Van B',
      paidAt: '2026-11-19 10:00:00',
      amount: 500000,
      receivedAmount: 500000,
      reconciliationStatus: 'MATCHED',
    };

    const status = getTransactionStatusInfo(tx);
    expect(status.type).toBe('MATCHED');
    expect(status.label).toBe('Thành công');
    expect(status.badgeClass).toContain('emerald');
  });

  it('should return UNDERPAID status when receivedAmount is less than amount', () => {
    const tx: IRevenueTransactionItem = {
      id: '2',
      orderCode: 'ORD-002',
      courseTitle: 'NestJS Microservices',
      studentName: 'Le Thi C',
      instructorName: 'Pham Van D',
      paidAt: '2026-11-19 10:00:00',
      amount: 799000,
      receivedAmount: 599000,
      reconciliationStatus: 'UNDERPAID',
    };

    const status = getTransactionStatusInfo(tx);
    expect(status.type).toBe('UNDERPAID');
    expect(status.label).toBe('Thiếu tiền');
    expect(status.badgeClass).toContain('amber');
  });

  it('should return OVERPAID status when receivedAmount is greater than amount', () => {
    const tx: IRevenueTransactionItem = {
      id: '3',
      orderCode: 'ORD-003',
      courseTitle: 'Digital Marketing',
      studentName: 'Do Quang E',
      instructorName: 'Dang Quoc F',
      paidAt: '2026-11-19 10:00:00',
      amount: 599000,
      receivedAmount: 650000,
      reconciliationStatus: 'OVERPAID',
    };

    const status = getTransactionStatusInfo(tx);
    expect(status.type).toBe('OVERPAID');
    expect(status.label).toBe('Thừa tiền');
    expect(status.badgeClass).toContain('sky');
  });

  it('should fallback to MATCHED when receivedAmount equals amount and no status set', () => {
    const tx: IRevenueTransactionItem = {
      id: '4',
      orderCode: 'ORD-004',
      courseTitle: 'UI/UX Design',
      studentName: 'Pham Gia H',
      instructorName: 'Nguyen Thi K',
      paidAt: '2026-11-19 10:00:00',
      amount: 649000,
      receivedAmount: 649000,
    };

    const status = getTransactionStatusInfo(tx);
    expect(status.type).toBe('MATCHED');
    expect(status.label).toBe('Thành công');
  });
});
