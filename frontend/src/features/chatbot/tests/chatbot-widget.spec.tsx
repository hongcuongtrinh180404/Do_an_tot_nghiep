// @vitest-environment jsdom

import { act, createElement, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePathname } from 'next/navigation';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import ChatbotWidget from '../components/chatbot-widget';
import styles from '../components/chatbot.module.css';
import { sendChatbotMessage } from '../api/chatbot.api';
import { foundReply } from './fixtures';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, className }: {
    href: string;
    children: ReactNode;
    onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
    className?: string;
  }) => createElement('a', { href, onClick, className }, children),
}));
vi.mock('@/features/auth/api/auth.api', () => ({ useCurrentUserQuery: vi.fn() }));
vi.mock('../api/chatbot.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/chatbot.api')>(),
  sendChatbotMessage: vi.fn(),
}));

let host: HTMLDivElement;
let root: Root;

function mobileMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(max-width: 639px)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
}

function setRoute(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname);
}

function signedIn(id = 'account-a') {
  vi.mocked(useCurrentUserQuery).mockReturnValue(
    { data: { id }, isLoading: false } as ReturnType<typeof useCurrentUserQuery>,
  );
}

function guest() {
  vi.mocked(useCurrentUserQuery).mockReturnValue(
    { data: undefined, isLoading: false } as ReturnType<typeof useCurrentUserQuery>,
  );
}

function render() {
  act(() => root.render(createElement(ChatbotWidget)));
}

function launcher() {
  return document.querySelector<HTMLButtonElement>('[data-chatbot-launcher]');
}

function openWidget() {
  act(() => launcher()!.click());
}

function panel() {
  return document.querySelector<HTMLElement>('[data-chatbot-panel]');
}

function panelText() {
  return panel()?.textContent ?? '';
}

function type(value: string) {
  const textarea = document.querySelector<HTMLTextAreaElement>('#mindly-chatbot-message')!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return textarea;
}

function pressEnter(textarea: HTMLTextAreaElement, shiftKey = false) {
  act(() => {
    textarea.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', shiftKey, bubbles: true, cancelable: true,
    }));
  });
}

async function settle() {
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(sendChatbotMessage).mockReset().mockResolvedValue({ reply: foundReply() });
  signedIn();
  setRoute('/courses');
  mobileMedia(false);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  document.querySelectorAll('[data-chatbot-panel], [data-chatbot-launcher]').forEach((node) => node.remove());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Chatbot widget visibility', () => {
  it.each([
    '/admin', '/admin/courses', '/checkout', '/login', '/register',
    '/reset-password', '/verify-email', '/courses/new', '/courses/abc/lessons/def',
  ])('stays hidden on %s', (pathname) => {
    setRoute(pathname);
    render();
    expect(launcher()).toBeNull();
  });

  it('appears on public pages and raises above the mobile purchase bar on a course detail', () => {
    setRoute('/courses/0123456789abcdef01234567');
    render();
    expect(launcher()?.className.split(' ')).toContain(styles.abovePurchase);
  });

  it('does not add the purchase-bar offset on the course list', () => {
    render();
    expect(launcher()?.className.split(' ')).not.toContain(styles.abovePurchase);
  });
});

describe('Chatbot widget session', () => {
  it('asks a guest to sign in instead of exposing the composer', () => {
    guest();
    render();
    openWidget();
    expect(panelText()).toContain('Đăng nhập để tìm khóa học');
    expect(panel()?.querySelector('a[href="/login"]')).not.toBeNull();
    expect(document.querySelector('#mindly-chatbot-message')).toBeNull();
    expect(sendChatbotMessage).not.toHaveBeenCalled();
  });

  it('sends a suggestion, shows progress, then renders the safe course card', async () => {
    let finish!: (result: Awaited<ReturnType<typeof sendChatbotMessage>>) => void;
    vi.mocked(sendChatbotMessage).mockImplementationOnce(
      () => new Promise((resolve) => { finish = resolve; }),
    );
    render();
    openWidget();
    expect(panelText()).toContain('Bạn muốn học gì?');

    const suggestion = [...panel()!.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Tìm khóa Python'))!;
    act(() => suggestion.click());
    expect(sendChatbotMessage).toHaveBeenCalledExactlyOnceWith(
      'Tìm khóa Python cho người mới', expect.any(AbortSignal),
    );
    expect(panelText()).toContain('Đang tra cứu');

    await act(async () => { finish({ reply: foundReply() }); });
    const card = panel()!.querySelector<HTMLAnchorElement>('a[href="/courses/0123456789abcdef01234567"]');
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain('Python nhập môn');
    expect(card!.textContent).toContain('Cơ bản');
    expect(card!.textContent).toContain('299.000');
    expect(panelText()).toContain('Hiển thị 1/1');
  });

  it('sends on Enter but not on Shift+Enter', async () => {
    render();
    openWidget();
    const textarea = type('Python');
    pressEnter(textarea, true);
    expect(sendChatbotMessage).not.toHaveBeenCalled();
    pressEnter(textarea);
    await settle();
    expect(sendChatbotMessage).toHaveBeenCalledExactlyOnceWith('Python', expect.any(AbortSignal));
    expect(document.querySelector<HTMLTextAreaElement>('#mindly-chatbot-message')?.value).toBe('');
  });

  it('explains a connection failure and retries the same question explicitly', async () => {
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce(new AxiosError('offline', 'ERR_NETWORK'));
    render();
    openWidget();
    type('Python');
    pressEnter(document.querySelector<HTMLTextAreaElement>('#mindly-chatbot-message')!);
    await settle();
    expect(panelText()).toContain('Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.');

    const retry = [...panel()!.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Thử lại câu hỏi'))!;
    await act(async () => { retry.click(); });
    await settle();
    expect(sendChatbotMessage).toHaveBeenCalledTimes(2);
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Python', expect.any(AbortSignal));
    expect(panel()!.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(panelText()).toContain('Python nhập môn');
  });

  it('returns to the sign-in gate when the JWT 401 cannot be recovered', async () => {
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce({
      isAxiosError: true, response: { status: 401, data: {}, headers: {} },
    });
    render();
    openWidget();
    type('Python');
    pressEnter(document.querySelector<HTMLTextAreaElement>('#mindly-chatbot-message')!);
    await settle();
    expect(panelText()).toContain('Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.');
    expect(document.querySelector('#mindly-chatbot-message')).toBeNull();
  });

  it('disables sending while the server quota countdown is active', async () => {
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({
      reply: foundReply(), retryAt: Date.now() + 3000,
    });
    render();
    openWidget();
    type('Python');
    pressEnter(document.querySelector<HTMLTextAreaElement>('#mindly-chatbot-message')!);
    await settle();
    expect(panelText()).toContain('Có thể gửi lại sau');
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Gửi câu hỏi"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLTextAreaElement>('#mindly-chatbot-message')?.disabled).toBe(false);
  });

  it('uses a modal backdrop only on mobile', () => {
    render();
    openWidget();
    expect(document.querySelector(`.${styles.backdrop}`)).toBeNull();

    act(() => root.unmount());
    mobileMedia(true);
    root = createRoot(host);
    render();
    openWidget();
    expect(document.querySelector(`.${styles.backdrop}`)).not.toBeNull();
  });
});
