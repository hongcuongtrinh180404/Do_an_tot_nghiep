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

  // Change email flow
  EMAIL_CHANGE_TOKEN_TTL_MS: 15 * 60 * 1000, // 15 minutes
  EMAIL_CHANGE_COOLDOWN_MS: 60 * 1000, // 60 seconds between requests
  EMAIL_CHANGE_REQUEST_SUCCESS_MESSAGE:
    'Liên kết xác nhận đã được gửi đến email mới. Vui lòng kiểm tra hộp thư.',
  EMAIL_CHANGE_INVALID_TOKEN_MESSAGE:
    'Liên kết xác nhận thay đổi email không hợp lệ hoặc đã hết hạn.',
  EMAIL_CHANGE_SUCCESS_MESSAGE:
    'Thay đổi email thành công. Vui lòng đăng nhập lại với địa chỉ email mới.',
  EMAIL_CHANGE_SAME_EMAIL_MESSAGE:
    'Địa chỉ email mới phải khác với địa chỉ email hiện tại.',
  EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE:
    'Địa chỉ email này đã được sử dụng bởi một tài khoản khác.',
  EMAIL_CHANGE_INVALID_PASSWORD_MESSAGE:
    'Mật khẩu hiện tại không chính xác.',
  EMAIL_CHANGE_PASSWORD_NOT_SET_MESSAGE:
    'Tài khoản chưa thiết lập mật khẩu Mindly. Vui lòng tạo mật khẩu trước.',

  // Change password flow
  CHANGE_PASSWORD_SUCCESS_MESSAGE:
    'Đổi mật khẩu thành công.',
  CHANGE_PASSWORD_INVALID_CURRENT_MESSAGE:
    'Mật khẩu hiện tại không chính xác.',
  CHANGE_PASSWORD_SAME_PASSWORD_MESSAGE:
    'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
  CHANGE_PASSWORD_MISMATCH_MESSAGE:
    'Xác nhận mật khẩu mới không trùng khớp.',
} as const;
