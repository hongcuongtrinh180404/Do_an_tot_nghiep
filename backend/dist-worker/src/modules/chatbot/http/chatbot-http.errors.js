import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatbotAiError } from '../chatbot.errors.js';
import { ChatbotContextError } from './chatbot-context.service.js';
import { ChatbotLearningError } from '../tools/my-learning.types.js';
import { SearchCoursesError } from '../tools/search-courses.contract.js';
const UNAVAILABLE = 'Trợ lý hiện tạm thời không khả dụng. Bạn vui lòng thử lại sau.';
export class ChatbotSearchUnavailableException extends HttpException {
    constructor(requestId) {
        super({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            code: 'CHATBOT_SEARCH_UNAVAILABLE',
            message: 'Tìm kiếm khóa học hiện tạm thời không khả dụng. Bạn vui lòng thử lại sau.',
            retryable: true,
            requestId,
        }, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
const ERROR_STATUS = {
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
export function chatbotHttpException(code, status, message, retryable, requestId) {
    return new HttpException({
        statusCode: status,
        code,
        message,
        retryable,
        ...(requestId ? { requestId } : {}),
    }, status);
}
export function mapChatbotHttpError(error, requestId) {
    if ((error instanceof ChatbotLearningError && error.code === 'CHATBOT_LEARNING_UNAVAILABLE')
        || (error instanceof SearchCoursesError && error.code === 'CHATBOT_SEARCH_UNAVAILABLE')) {
        return chatbotHttpException(error.code, HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE, true, requestId);
    }
    if (error instanceof ChatbotContextError) {
        return chatbotHttpException('CHATBOT_CONTEXT_INVALID', HttpStatus.BAD_REQUEST, 'Ngữ cảnh tìm kiếm đã hết hạn hoặc không hợp lệ. Bạn vui lòng nêu lại chủ đề và điều kiện.', false, requestId);
    }
    if (!(error instanceof ChatbotAiError)) {
        return chatbotHttpException('CHATBOT_INTERNAL_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, UNAVAILABLE, false, requestId);
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
    return chatbotHttpException(error.code, ERROR_STATUS[error.code], message, error.retryable, requestId);
}
//# sourceMappingURL=chatbot-http.errors.js.map