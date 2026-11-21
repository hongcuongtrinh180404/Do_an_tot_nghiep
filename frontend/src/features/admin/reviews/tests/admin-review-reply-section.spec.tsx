// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewStatusEnum, type IReview } from 'share-lib';
import { AdminReviewReplyDisplay } from '@/components/shared/review/admin-review-reply-display';
import { AdminReviewReplySection } from '../components/admin-review-reply-section';

vi.mock('@/components/ui/icon', () => ({
  Icon: () => React.createElement('span', { 'aria-hidden': true }),
}));
vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.createElement('button', props),
}));

describe('Admin review reply section', () => {
  let root: Root;
  let host: HTMLDivElement;
  const save = vi.fn();
  const review: IReview = {
    id: 'review-1', courseId: 'course-1', userId: 'student-1',
    rating: 2, comment: 'Video không phát được.',
    status: ReviewStatusEnum.VISIBLE,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
  const reply = {
    content: 'Chúng tôi đang kiểm tra.',
    adminId: 'admin-1', adminName: 'Quản trị viên ban đầu',
    repliedAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T11:00:00Z',
    updatedById: 'admin-2', updatedByName: 'Người cập nhật',
  };

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    save.mockReset().mockResolvedValue(undefined);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  function render(value: IReview = review, isPending = false) {
    act(() => root.render(<AdminReviewReplySection review={value} isPending={isPending} onSave={save} />));
  }
  function draft(value: string) {
    act(() => {
      const field = host.querySelector('textarea')!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  function button(label: string) {
    const node = [...host.querySelectorAll('button')].find((item) => item.textContent === label);
    expect(node).toBeDefined();
    return node!;
  }
  async function submit() {
    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  }

  it('labels the public composer, displays a counter, and rejects empty or oversized drafts', async () => {
    render();
    expect(host.textContent).toContain('Phản hồi từ ban quản trị');
    expect(host.textContent).toContain('công khai');
    expect(host.querySelector('textarea')?.labels).toHaveLength(1);
    expect(host.querySelector('textarea')?.maxLength).toBe(2000);
    expect(button('Gửi phản hồi').disabled).toBe(true);
    draft('  \n ');
    await submit();
    draft('x'.repeat(2001));
    await submit();
    expect(button('Gửi phản hồi').disabled).toBe(true);
    expect(host.textContent).toContain('2001/2000');
    expect(save).not.toHaveBeenCalled();
  });

  it('trims content before saving and does not send student fields', async () => {
    render();
    draft('  Cảm ơn bạn.\nChúng tôi đang kiểm tra lỗi.  ');
    await submit();
    expect(save).toHaveBeenCalledExactlyOnceWith('Cảm ơn bạn.\nChúng tôi đang kiểm tra lỗi.');
  });

  it('preserves an unsent draft if a background refetch discovers another admin reply', () => {
    render();
    draft('Nội dung tôi đang soạn.');
    render({ ...review, adminReply: reply });
    expect(host.querySelector('textarea')?.value).toBe('Nội dung tôi đang soạn.');
    expect(save).not.toHaveBeenCalled();
  });

  it('preserves the draft after a failure and supports retry', async () => {
    save.mockRejectedValueOnce(new Error('Unavailable'));
    render();
    draft('Nội dung cần giữ lại');
    await submit();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('vẫn được giữ lại');
    expect(host.querySelector('textarea')?.value).toBe('Nội dung cần giữ lại');
    await submit();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('prevents rapid duplicate submissions even before pending props update', async () => {
    let resolve!: () => void;
    save.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    render();
    draft('Đang kiểm tra.');
    act(() => {
      for (let i = 0; i < 2; i++) host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(save).toHaveBeenCalledOnce();
    render(review, true);
    expect(host.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelector('textarea')?.disabled).toBe(true);
    expect(button('Đang gửi...').disabled).toBe(true);
    await act(async () => { resolve(); });
  });

  it('edits with keyboard focus, disables an unchanged save, and cancels without saving', () => {
    render({ ...review, adminReply: reply });
    expect(host.querySelector('textarea')).toBeNull();
    act(() => button('Sửa phản hồi').click());
    expect(document.activeElement).toBe(host.querySelector('textarea'));
    expect(host.querySelector('textarea')?.value).toBe(reply.content);
    expect(button('Lưu thay đổi').disabled).toBe(true);
    draft('Nội dung sẽ hủy');
    act(() => button('Hủy').click());
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.textContent).toContain(reply.content);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    { status: ReviewStatusEnum.HIDDEN },
    { status: ReviewStatusEnum.DELETED },
    { deletedAt: '2026-11-20T12:00:00Z' },
  ])('makes a moderated review read-only (%#)', async (fields) => {
    render({ ...review, ...fields, adminReply: reply });
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.querySelector('button')).toBeNull();
    expect(host.textContent).toContain(reply.content);
    expect(host.textContent).toContain('Chỉ có thể gửi hoặc sửa phản hồi');
    expect(save).not.toHaveBeenCalled();
  });

  it('shows an honest empty state for a moderated review without a reply', () => {
    render({ ...review, status: ReviewStatusEnum.HIDDEN });
    expect(host.textContent).toContain('Chưa có phản hồi.');
    expect(host.querySelector('form')).toBeNull();
  });

  it('renders public replies as text and hides internal author/editor details', () => {
    act(() => root.render(<AdminReviewReplyDisplay reply={{ ...reply, content: '<img src=x onerror=alert(1)>' }} />));
    expect(host.textContent).toContain('Phản hồi từ ban quản trị');
    expect(host.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('Đã chỉnh sửa');
    expect(host.textContent).not.toContain(reply.adminName);
    expect(host.textContent).not.toContain(reply.updatedByName);
  });
});
