// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatbotReplySchema } from '../chatbot.contract';
import { InstructorBusinessReply } from '../components/instructor-business-reply';
import type { ChatbotBusinessReply } from '../chatbot-business.contract';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => createElement('a', { href }, children),
}));
const courseId = '0123456789abcdef01234567';
const totals = { totalRevenue: 200000, instructorEarnings: 140000, platformCommission: 60000,
  successfulSales: 2, reconstructedOrders: 1 };
const zero = { totalRevenue: 0, instructorEarnings: 0, platformCommission: 0, successfulSales: 0, reconstructedOrders: 0 };
const common = { course: null, currency: 'VND' as const, timeZone: 'Asia/Ho_Chi_Minh' as const,
  asOf: '2026-11-22T08:15:00.000Z',
  period: { startDate: '2026-11-01', endDate: '2026-11-22', startAt: '2026-10-31T17:00:00.000Z',
    endAtExclusive: '2026-11-22T08:15:00.000Z', isPartial: true } };
const base = { requestId: '65ac3483-7075-48e3-8bbe-4c3a6eb9cced', answer: 'Kết quả từ dữ liệu kiểm thử.', context: 'signed-v3' };
function revenue(): ChatbotBusinessReply {
  return { ...base, kind: 'instructor_revenue', status: 'found', result: { ...common, scope: 'revenue', totals: { ...totals } } };
}
function comparison(): ChatbotBusinessReply {
  return { ...base, kind: 'instructor_sales_stats', status: 'found', result: { ...common, scope: 'compare',
    metric: 'instructor_earnings', current: { ...totals }, previous: { ...zero },
    previousPeriod: { startDate: '2026-10-01', endDate: '2026-10-31',
      startAt: '2026-09-30T17:00:00.000Z', endAtExclusive: '2026-10-31T17:00:00.000Z', isPartial: false },
    change: { absolute: 140000, percent: null, direction: 'new' } } };
}
function ranking(): ChatbotBusinessReply {
  return { ...base, kind: 'instructor_sales_stats', status: 'found', result: { ...common, scope: 'top_courses',
    totals: { ...totals }, items: [{ ...totals, id: courseId, title: 'React thực hành', rank: 1 }],
    total: 2, page: 1, limit: 1, hasMore: true, topTiedCount: 2 } };
}
describe('Instructor business response contract', () => {
  it('accepts net revenue, exact zero, safe comparison and ranked rows and drops private extra fields', () => {
    for (const reply of [revenue(), ranking(), comparison()]) expect(chatbotReplySchema.safeParse(reply).success).toBe(true);
    const response = revenue();
    Object.assign(response.result, { accountNumber: 'private', orderId: 'private' });
    expect(JSON.stringify(chatbotReplySchema.parse(response))).not.toContain('private');
    expect(chatbotReplySchema.safeParse({ ...revenue(), status: 'empty',
      result: { ...common, scope: 'revenue', totals: zero } }).success).toBe(true);
  });
  it('rejects incorrect money reconciliation, negative/unsafe amounts and missing totals', () => {
    for (const bad of [
      { ...totals, instructorEarnings: 140001 }, { ...totals, totalRevenue: -1 },
      { ...totals, totalRevenue: Number.MAX_SAFE_INTEGER + 1 }, { ...totals, reconstructedOrders: 3 },
    ]) {
      expect(chatbotReplySchema.safeParse({ ...revenue(), result: { ...common, scope: 'revenue', totals: bad } }).success).toBe(false);
    }
  });
  it('rejects impossible deltas, fake percentages from zero and wrong reply kind/status', () => {
    const response = comparison();
    if (response.result.scope !== 'compare') throw new Error('Expected compare');
    for (const change of [
      { absolute: 140001, percent: null, direction: 'new' },
      { absolute: 140000, percent: 100, direction: 'up' },
      { absolute: 140000, percent: Infinity, direction: 'new' },
    ]) expect(chatbotReplySchema.safeParse({ ...response, result: { ...response.result, change } }).success).toBe(false);
    expect(chatbotReplySchema.safeParse({ ...revenue(), kind: 'instructor_sales_stats' }).success).toBe(false);
    expect(chatbotReplySchema.safeParse({ ...revenue(), status: 'empty' }).success).toBe(false);
  });
  it('rejects dates in the future, wrong timezone boundaries and inconsistent rank pagination', () => {
    expect(chatbotReplySchema.safeParse({ ...revenue(), result: { ...common, scope: 'revenue', totals,
      asOf: '2026-11-01T00:00:00.000Z' } }).success).toBe(false);
    expect(chatbotReplySchema.safeParse({ ...revenue(), result: { ...common, scope: 'revenue', totals,
      period: { ...common.period, startAt: '2026-11-01T00:00:00.000Z' } } }).success).toBe(false);
    const response = ranking();
    expect(chatbotReplySchema.safeParse({ ...response, result: { ...response.result, hasMore: false } }).success).toBe(false);
  });
});
describe('Instructor business cards', () => {
  let host: HTMLDivElement;
  let root: Root;
  const onAsk = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    onAsk.mockReset();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  const render = (reply: ChatbotBusinessReply, disabled = false) => {
    act(() => root.render(createElement(InstructorBusinessReply, { reply, disabled, onAsk, onNavigate: vi.fn() })));
  };
  it('leads with net income, explains the commission split and never labels it a completed bank payout', () => {
    render(revenue());
    expect(host.textContent).toContain('Thu nhập sau hoa hồng');
    expect(host.textContent).toContain('140.000');
    expect(host.textContent).toContain('60.000');
    expect(host.textContent).toContain('không phải xác nhận đã chi trả');
    expect(host.textContent).toContain('1 đơn cũ');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/instructor/statistics');
  });
  it('shows the full previous month and new growth from zero without a false 100 percent', () => {
    render(comparison());
    expect(host.textContent).toContain('01/10/2026–31/10/2026');
    expect(host.textContent).toContain('Phát sinh từ mức 0');
    expect(host.textContent).not.toContain('100%');
  });
  it('keeps ordinal selection separate from rank and disables historical/pending controls', () => {
    render(ranking());
    const buttons = [...host.querySelectorAll('button')];
    act(() => buttons[0].click());
    expect(onAsk).toHaveBeenCalledWith('Xem doanh thu khóa thứ 1');
    act(() => buttons[1].click());
    expect(onAsk).toHaveBeenCalledWith('Xem thêm');
    render(ranking(), true);
    expect([...host.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
  });
  it('uses actual zero counts and renders untrusted course titles only as text', () => {
    render({ ...base, kind: 'instructor_sales_stats', status: 'empty',
      result: { ...common, scope: 'sales_count', totals: zero } });
    expect(host.textContent).toContain('0');
    expect(host.textContent).toContain('Không bao gồm đăng ký miễn phí');
    render({ ...base, kind: 'instructor_revenue', status: 'needs_clarification',
      result: { ...common, scope: 'selection', items: [{ id: courseId, title: '<img src=x onerror=alert(1)>' }],
        total: 2, page: 1, limit: 1, hasMore: true } });
    expect(host.querySelector('img')).toBeNull();
    act(() => host.querySelector('button')!.click());
    expect(onAsk).toHaveBeenLastCalledWith('Chọn khóa thứ 1');
  });
});
