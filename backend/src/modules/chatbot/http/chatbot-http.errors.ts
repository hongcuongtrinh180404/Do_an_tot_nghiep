import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatbotAiError, type ChatbotAiErrorCode } from '../chatbot.errors.js';

type ChatbotHttpErrorCode =
  | ChatbotAiErrorCode
  | 'CHATBOT_HTTP_RATE_LIMITED'
  | 'CHATBOT_SEARCH_UNAVAILABLE'
  | 'CHATBOT_INTERNAL_ERROR';

const UNAVAILABLE =
  'Trợ lý hiện tạm thời không khả dụng. Bạn vui lòng thử lại sau.';

export class ChatbotSearchUnavailableException extends HttpException {
  constructor(requestId: string) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'CHATBOT_SEARCH_UNAVAILABLE',
        message:
          'Tìm kiếm khóa học hiện tạm thời không khả dụng. Bạn vui lòng thử lại sau.',
        retryable: true,
        requestId,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

const ERROR_STATUS: Record<ChatbotAiErrorCode, HttpStatus> = {
  CHATBOT_DISABLED: HttpStatus.SERVICE_UNAVAILABLE,
  CHATBOT_CONFIG_INVALID: HttpStatus.SERVICE_UNAVAILABLE,
  CHATBOT_REQUEST_INVALID: HttpStatus.BAD_REQUEST,
  CHATBOT_PROVIDER_AUTH: HttpStatus.SERVICE_UNAVAILABLE,
  CHATBOT_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  CHATBOT_TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
  CHATBOT_CANCELLED: HttpStatus.REQUEST_TIMEOUT,
  CHATBOT_PROVIDER_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  CHATBOT_PROVIDER_ERROR: HttpStatus.BAD_GATEWAY,
  CHATBOT_RESPONSE_INVALID: HttpStatus.BAD_GATEWAY,
  CHATBOT_RESPONSE_INCOMPLETE: HttpStatus.BAD_GATEWAY,
  CHATBOT_RESPONSE_BLOCKED: HttpStatus.UNPROCESSABLE_ENTITY,
};

export function chatbotHttpException(
  code: ChatbotHttpErrorCode,
  status: HttpStatus,
  message: string,
  retryable: boolean,
  requestId?: string,
): HttpException {
  return new HttpException(
    {
      statusCode: status,
      code,
      message,
      retryable,
      ...(requestId ? { requestId } : {}),
    },
    status,
  );
}

/** Only Mindly's JWT guard may produce 401; provider authentication never does. */
export function mapChatbotHttpError(
  error: unknown,
  requestId: string,
): HttpException {
  if (!(error instanceof ChatbotAiError)) {
    return chatbotHttpException(
      'CHATBOT_INTERNAL_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      UNAVAILABLE,
      false,
      requestId,
    );
  }
  let message = UNAVAILABLE;
  switch (error.code) {
    case 'CHATBOT_REQUEST_INVALID':
      message =
        'Yêu cầu chatbot không hợp lệ. Bạn vui lòng kiểm tra lại câu hỏi.';
      break;
    case 'CHATBOT_RATE_LIMITED':
      message = 'Dịch vụ AI đang giới hạn lượt gọi. Bạn vui lòng thử lại sau.';
      break;
    case 'CHATBOT_TIMEOUT':
      message = 'Trợ lý phản hồi quá thời gian chờ. Bạn vui lòng thử lại sau.';
      break;
    case 'CHATBOT_CANCELLED':
      message = 'Yêu cầu chatbot đã được hủy.';
      break;
    case 'CHATBOT_RESPONSE_BLOCKED':
      message = 'Trợ lý chưa thể xử lý câu hỏi này. Bạn vui lòng diễn đạt lại.';
      break;
  }
  return chatbotHttpException(
    error.code,
    ERROR_STATUS[error.code],
    message,
    error.retryable,
    requestId,
  );
}
