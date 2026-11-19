import axios from 'axios';
import type { IApiResponse } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import {
  chatbotReplySchema,
  CHATBOT_REQUEST_TIMEOUT_MS,
  type ChatbotFailure,
  type ChatbotReply,
} from '../chatbot.contract';

/** Retry-After supports seconds or an HTTP date; invalid values never create a countdown. */
export function retryAtFromHeader(value: unknown, now = Date.now()): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds > 0 && seconds <= 86400
      ? now + Math.ceil(seconds * 1000)
      : undefined;
  }
  if (!/^[A-Za-z]{3}, /.test(text)) return undefined;
  const date = Date.parse(text);
  return Number.isFinite(date) && date > now ? date : undefined;
}

export function chatbotFailure(error: unknown): ChatbotFailure {
  const fallback: ChatbotFailure = {
    message: 'Chưa thể nhận phản hồi. Bạn vui lòng thử lại.',
    retryable: true,
    requiresLogin: false,
  };
  if (!axios.isAxiosError(error)) return fallback;

  const status = error.response?.status;
  const body = error.response?.data as { requestId?: unknown; retryable?: unknown } | undefined;
  const requestId = typeof body?.requestId === 'string'
    && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(body.requestId)
    ? body.requestId : undefined;
  const base = { ...fallback, requestId };

  if (status === 401) return {
    ...base, message: 'Phiên đăng nhập đã hết hạn. Bạn vui lòng đăng nhập lại.',
    retryable: false, requiresLogin: true,
  };
  if (status === 429) return {
    ...base, message: 'Bạn đang gửi câu hỏi quá nhanh hoặc dịch vụ đang giới hạn lượt gọi. Vui lòng chờ rồi thử lại.',
    retryAt: retryAtFromHeader(error.response?.headers['retry-after']),
  };
  if (status === 504 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return {
    ...base, message: 'Tìm kiếm mất nhiều thời gian hơn dự kiến. Bạn có thể thử lại.',
  };
  if (status === 400 || status === 422) return {
    ...base, message: 'Chưa xử lý được câu hỏi này. Hãy nêu rõ chủ đề, mức giá hoặc trình độ muốn tìm.',
    retryable: false,
  };
  if (status === 403) return {
    ...base, message: 'Tài khoản hiện không có quyền sử dụng trợ lý.', retryable: false,
  };
  if (status && status >= 500) return {
    ...base, message: 'Trợ lý tìm khóa học tạm thời không khả dụng. Bạn vui lòng thử lại sau.',
    retryable: body?.retryable !== false,
  };
  if (!error.response) return {
    ...base, message: 'Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.',
  };
  return base;
}

export async function sendChatbotMessage(
  message: string,
  signal: AbortSignal,
): Promise<{ reply: ChatbotReply; retryAt?: number }> {
  // Reuse Mindly's Bearer/refresh interceptors. Only a JWT 401 triggers refresh.
  const response = await apiClient.post<IApiResponse<unknown>>(
    '/chatbot/messages',
    { message },
    { timeout: CHATBOT_REQUEST_TIMEOUT_MS, signal },
  );
  if (!response.data.success) throw new Error('Invalid chatbot response');
  const reply = chatbotReplySchema.parse(response.data.data);
  return {
    reply,
    retryAt: String(response.headers['x-ratelimit-remaining']) === '0'
      ? retryAtFromHeader(response.headers['x-ratelimit-reset'])
      : undefined,
  };
}
