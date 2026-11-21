import { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError, } from 'openai';
const ERROR_MESSAGES = {
    CHATBOT_DISABLED: 'Chatbot AI is disabled.',
    CHATBOT_CONFIG_INVALID: 'Chatbot AI configuration is invalid.',
    CHATBOT_REQUEST_INVALID: 'Chatbot AI request is invalid.',
    CHATBOT_PROVIDER_AUTH: 'Chatbot AI provider credentials were rejected.',
    CHATBOT_RATE_LIMITED: 'Chatbot AI provider rate limit was reached.',
    CHATBOT_TIMEOUT: 'Chatbot AI request timed out.',
    CHATBOT_CANCELLED: 'Chatbot AI request was cancelled.',
    CHATBOT_PROVIDER_UNAVAILABLE: 'Chatbot AI provider is temporarily unavailable.',
    CHATBOT_PROVIDER_ERROR: 'Chatbot AI provider request failed.',
    CHATBOT_RESPONSE_INVALID: 'Chatbot AI provider returned an invalid response.',
    CHATBOT_RESPONSE_INCOMPLETE: 'Chatbot AI response was truncated.',
    CHATBOT_RESPONSE_BLOCKED: 'Chatbot AI provider could not complete this response.',
};
const RETRYABLE_CODES = new Set([
    'CHATBOT_RATE_LIMITED',
    'CHATBOT_TIMEOUT',
    'CHATBOT_PROVIDER_UNAVAILABLE',
]);
export class ChatbotAiError extends Error {
    code;
    configurationFields;
    retryable;
    constructor(code, configurationFields = []) {
        super(configurationFields.length
            ? `${ERROR_MESSAGES[code]} Check: ${configurationFields.join(', ')}.`
            : ERROR_MESSAGES[code]);
        this.code = code;
        this.configurationFields = configurationFields;
        this.name = 'ChatbotAiError';
        this.retryable = RETRYABLE_CODES.has(code);
    }
}
export function normalizeChatbotError(error, signal) {
    if (error instanceof ChatbotAiError)
        return error;
    if (signal?.aborted || error instanceof APIUserAbortError) {
        return new ChatbotAiError('CHATBOT_CANCELLED');
    }
    if (error instanceof APIConnectionTimeoutError) {
        return new ChatbotAiError('CHATBOT_TIMEOUT');
    }
    if (error instanceof APIConnectionError) {
        return new ChatbotAiError('CHATBOT_PROVIDER_UNAVAILABLE');
    }
    if (error instanceof APIError) {
        if (error.status === 401 || error.status === 403) {
            return new ChatbotAiError('CHATBOT_PROVIDER_AUTH');
        }
        if (error.status === 429)
            return new ChatbotAiError('CHATBOT_RATE_LIMITED');
        if (error.status === 408)
            return new ChatbotAiError('CHATBOT_TIMEOUT');
        if (error.status !== undefined && error.status >= 500) {
            return new ChatbotAiError('CHATBOT_PROVIDER_UNAVAILABLE');
        }
        if (error.status !== undefined &&
            error.status >= 400 &&
            error.status < 500) {
            return new ChatbotAiError('CHATBOT_REQUEST_INVALID');
        }
    }
    return new ChatbotAiError('CHATBOT_PROVIDER_ERROR');
}
//# sourceMappingURL=chatbot.errors.js.map