import { isAxiosError } from 'axios';

interface TeachingStatsErrorResponse {
  code?: string;
  message?: string;
}

export function isTeachingStatsDataIncomplete(error: unknown): boolean {
  return isAxiosError<TeachingStatsErrorResponse>(error)
    && error.response?.data?.code === 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE';
}

export function shouldRetryTeachingStats(failureCount: number, error: unknown): boolean {
  if (isTeachingStatsDataIncomplete(error)) return false;
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') return false;
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
  }
  return failureCount < 2;
}

export function teachingStatsErrorMessage(error: unknown): string {
  if (isTeachingStatsDataIncomplete(error) && isAxiosError<TeachingStatsErrorResponse>(error)) {
    const message = error.response?.data?.message;
    return typeof message === 'string' && message.trim()
      ? message
      : 'Dữ liệu thanh toán chưa đầy đủ. Vui lòng liên hệ quản trị viên để đối soát.';
  }
  return 'Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
}
