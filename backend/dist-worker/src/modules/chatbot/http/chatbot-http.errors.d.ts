import { HttpException, HttpStatus } from '@nestjs/common';
import { type ChatbotAiErrorCode } from '../chatbot.errors.js';
type ChatbotHttpErrorCode = ChatbotAiErrorCode | 'CHATBOT_HTTP_RATE_LIMITED' | 'CHATBOT_SEARCH_UNAVAILABLE' | 'CHATBOT_LEARNING_UNAVAILABLE' | 'CHATBOT_CONTEXT_INVALID' | 'CHATBOT_INTERNAL_ERROR';
export declare class ChatbotSearchUnavailableException extends HttpException {
    constructor(requestId: string);
}
export declare function chatbotHttpException(code: ChatbotHttpErrorCode, status: HttpStatus, message: string, retryable: boolean, requestId?: string): HttpException;
export declare function mapChatbotHttpError(error: unknown, requestId: string): HttpException;
export {};
