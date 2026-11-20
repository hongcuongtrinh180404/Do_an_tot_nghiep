// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { useChatbot } from '../hooks/use-chatbot';
import { sendChatbotMessage } from '../api/chatbot.api';
import { foundReply } from './fixtures';

vi.mock('../api/chatbot.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/chatbot.api')>(),
  sendChatbotMessage: vi.fn(),
}));

let root: Root;
let host: HTMLDivElement;
let chat: ReturnType<typeof useChatbot>;
function Harness() {
  const value = useChatbot();
  useEffect(() => { chat = value; }, [value]);
  return null;
}
function mount(key = 'account-a') {
  act(() => root.render(createElement(Harness, { key })));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  vi.mocked(sendChatbotMessage).mockReset().mockResolvedValue({ reply: foundReply() });
  mount();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Chat session lifecycle', () => {
  it('prevents a double send, trims input, and sends only the current question', async () => {
    await act(async () => {
      expect(chat.send('  Python  ')).toBe(true);
      expect(chat.send('duplicate')).toBe(false);
    });
    expect(sendChatbotMessage).toHaveBeenCalledExactlyOnceWith('Python', expect.any(AbortSignal));
    await act(async () => { chat.send('React dưới 500k'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('React dưới 500k', expect.any(AbortSignal));
    expect(chat.turns).toHaveLength(2);
  });

  it('rejects empty/overlong messages and accepts the 2000-character boundary', async () => {
    act(() => {
      expect(chat.send(' \n ')).toBe(false);
      expect(chat.send('x'.repeat(2001))).toBe(false);
    });
    expect(sendChatbotMessage).not.toHaveBeenCalled();
    await act(async () => { expect(chat.send('x'.repeat(2000))).toBe(true); });
    expect(chat.turns).toHaveLength(1);
  });

  it('clearing cancels in-flight work and ignores late completion', async () => {
    let finish!: (result: Awaited<ReturnType<typeof sendChatbotMessage>>) => void;
    vi.mocked(sendChatbotMessage).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    act(() => { chat.send('Python'); });
    const signal = vi.mocked(sendChatbotMessage).mock.calls[0][1];
    act(() => chat.clear());
    expect(signal.aborted).toBe(true);
    await act(async () => { finish({ reply: foundReply() }); });
    expect(chat.turns).toEqual([]);
    expect(chat.isPending).toBe(false);
  });

  it('account switching cancels the old request and never puts its answer in the new session', async () => {
    let finish!: (result: Awaited<ReturnType<typeof sendChatbotMessage>>) => void;
    vi.mocked(sendChatbotMessage).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    act(() => { chat.send('private question'); });
    const signal = vi.mocked(sendChatbotMessage).mock.calls[0][1];
    mount('account-b');
    await act(async () => { finish({ reply: foundReply() }); });
    expect(signal.aborted).toBe(true);
    expect(chat.turns).toEqual([]);
  });

  it('counts down quota after success, including after the visible history is cleared', async () => {
    vi.useFakeTimers();
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({ reply: foundReply(), retryAt: Date.now() + 2000 });
    await act(async () => { chat.send('Python'); });
    expect(chat.secondsRemaining).toBe(2);
    act(() => { chat.clear(); expect(chat.send('React')).toBe(false); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(chat.secondsRemaining).toBe(0);
    await act(async () => { expect(chat.send('React')).toBe(true); });
    expect(sendChatbotMessage).toHaveBeenCalledTimes(2);
  });

  it('retry is explicit, preserves the user turn, and replaces the failure', async () => {
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce(new AxiosError('offline', 'ERR_NETWORK'));
    await act(async () => { chat.send('Python'); });
    expect(chat.turns[0].status).toBe('error');
    expect(sendChatbotMessage).toHaveBeenCalledOnce();
    await act(async () => { expect(chat.retry(chat.turns[0])).toBe(true); });
    expect(chat.turns).toHaveLength(1);
    expect(chat.turns[0].status).toBe('success');
  });

  it('requires reauthentication after an unrecovered 401 and clears the transcript', async () => {
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce({
      isAxiosError: true, response: { status: 401, data: {}, headers: {} },
    });
    await act(async () => { chat.send('Python'); });
    expect(chat.requiresLogin).toBe(true);
    expect(chat.turns).toEqual([]);
    expect(chat.send('Retry')).toBe(false);
  });

  it('uses only the latest successful signed context for follow-ups, without transmitting history', async () => {
    vi.mocked(sendChatbotMessage)
      .mockResolvedValueOnce({ reply: { ...foundReply(), context: 'context-a' } })
      .mockResolvedValueOnce({ reply: { ...foundReply(), context: 'context-b' } });
    await act(async () => { chat.send('Backend dưới 200k'); });
    await act(async () => { chat.send('Chỉ dành cho người mới'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Chỉ dành cho người mới', expect.any(AbortSignal), 'context-a');
    await act(async () => { chat.send('Xem thêm'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Xem thêm', expect.any(AbortSignal), 'context-b');
  });

  it('clearing drops context and ignores a cancelled response that tries to restore it', async () => {
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({ reply: { ...foundReply(), context: 'old-context' } });
    await act(async () => { chat.send('Backend'); });
    let finish!: (result: Awaited<ReturnType<typeof sendChatbotMessage>>) => void;
    vi.mocked(sendChatbotMessage).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    act(() => { chat.send('Xem thêm'); });
    act(() => chat.clear());
    await act(async () => { finish({ reply: { ...foundReply(), context: 'late-context' } }); });
    await act(async () => { chat.send('Python'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Python', expect.any(AbortSignal));
    expect(chat.turns).toHaveLength(1);
  });

  it('does not carry a previous account context into another account', async () => {
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({ reply: { ...foundReply(), context: 'account-a-context' } });
    await act(async () => { chat.send('Backend'); });
    mount('account-b');
    await act(async () => { chat.send('Xem thêm'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Xem thêm', expect.any(AbortSignal));
  });

  it('retains context after clarification/provider failure, and retries using the original request context', async () => {
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({ reply: { ...foundReply(), context: 'context-a' } });
    await act(async () => { chat.send('Backend'); });
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce(new AxiosError('offline', 'ERR_NETWORK'));
    await act(async () => { chat.send('Xem thêm'); });
    await act(async () => { chat.retry(chat.turns[1]); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Xem thêm', expect.any(AbortSignal), 'context-a');
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({ reply: {
      requestId: foundReply().requestId, status: 'needs_clarification', answer: 'Bạn đã xem hết kết quả.',
    } });
    await act(async () => { chat.send('Xem thêm'); });
    await act(async () => { chat.send('Chỉ cho người mới'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Chỉ cho người mới', expect.any(AbortSignal), 'context-a');
  });

  it('drops an expired context without logging out and starts the next question fresh', async () => {
    vi.mocked(sendChatbotMessage).mockResolvedValueOnce({ reply: { ...foundReply(), context: 'expired-context' } });
    await act(async () => { chat.send('Backend'); });
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce({
      isAxiosError: true, response: { status: 400, data: { code: 'CHATBOT_CONTEXT_INVALID' }, headers: {} },
    });
    await act(async () => { chat.send('Xem thêm'); });
    expect(chat.requiresLogin).toBe(false);
    await act(async () => { chat.send('Python dưới 200k'); });
    expect(sendChatbotMessage).toHaveBeenLastCalledWith('Python dưới 200k', expect.any(AbortSignal));
  });

  it('does not retry an older failed branch after a newer question has been sent', async () => {
    vi.mocked(sendChatbotMessage).mockRejectedValueOnce(new AxiosError('offline', 'ERR_NETWORK'));
    await act(async () => { chat.send('Backend'); });
    const failed = chat.turns[0];
    await act(async () => { chat.send('Yoga'); });
    act(() => expect(chat.retry(failed)).toBe(false));
    expect(sendChatbotMessage).toHaveBeenCalledTimes(2);
  });
});
