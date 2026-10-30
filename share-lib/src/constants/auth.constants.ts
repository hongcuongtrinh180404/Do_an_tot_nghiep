export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  SESSION_GRACE_PERIOD_MS: 30 * 1000, // 30 seconds
  MIN_PASSWORD_LENGTH: 6,

  // Password reset flow
  PASSWORD_RESET_TOKEN_TTL_MS: 15 * 60 * 1000, // 15 minutes
  PASSWORD_RESET_COOLDOWN_MS: 60 * 1000, // 60 seconds between requests per account
  PASSWORD_RESET_GENERIC_MESSAGE:
    'Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE:
    'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  PASSWORD_RESET_SUCCESS_MESSAGE:
    'Thiết lập mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
  PASSWORD_RESET_RATE_LIMIT_MESSAGE:
    'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
} as const;
