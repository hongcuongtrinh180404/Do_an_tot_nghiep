import { HttpException, HttpStatus } from '@nestjs/common';
import { type ChatbotAiErrorCode } from '../chatbot.errors.js';
type ChatbotHttpErrorCode = ChatbotAiErrorCode | 'CHATBOT_HTTP_RATE_LIMITED' | 'CHATBOT_SEARCH_UNAVAILABLE' | 'CHATBOT_LEARNING_UNAVAILABLE' | 'CHATBOT_CONTEXT_INVALID' | 'CHATBOT_INTERNAL_ERROR';
type BusinessHttpCode = 'CHATBOT_INSTRUCTOR_FORBIDDEN' | 'CHATBOT_REVENUE_UNAVAILABLE' | 'CHATBOT_REVENUE_DATA_INCOMPLETE';
export declare class ChatbotSearchUnavailableException extends HttpException {
    constructor(requestId: string);
}
export declare function chatbotHttpException(code: ChatbotHttpErrorCode | BusinessHttpCode, status: HttpStatus, message: string, retryable: boolean, requestId?: string): HttpException;
export declare function mapChatbotHttpError(error: unknown, requestId: string): HttpException;
export {};
