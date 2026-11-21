declare const ERROR_MESSAGES: {
    readonly CHATBOT_DISABLED: "Chatbot AI is disabled.";
    readonly CHATBOT_CONFIG_INVALID: "Chatbot AI configuration is invalid.";
    readonly CHATBOT_REQUEST_INVALID: "Chatbot AI request is invalid.";
    readonly CHATBOT_PROVIDER_AUTH: "Chatbot AI provider credentials were rejected.";
    readonly CHATBOT_RATE_LIMITED: "Chatbot AI provider rate limit was reached.";
    readonly CHATBOT_TIMEOUT: "Chatbot AI request timed out.";
    readonly CHATBOT_CANCELLED: "Chatbot AI request was cancelled.";
    readonly CHATBOT_PROVIDER_UNAVAILABLE: "Chatbot AI provider is temporarily unavailable.";
    readonly CHATBOT_PROVIDER_ERROR: "Chatbot AI provider request failed.";
    readonly CHATBOT_RESPONSE_INVALID: "Chatbot AI provider returned an invalid response.";
    readonly CHATBOT_RESPONSE_INCOMPLETE: "Chatbot AI response was truncated.";
    readonly CHATBOT_RESPONSE_BLOCKED: "Chatbot AI provider could not complete this response.";
};
export type ChatbotAiErrorCode = keyof typeof ERROR_MESSAGES;
export declare class ChatbotAiError extends Error {
    readonly code: ChatbotAiErrorCode;
    readonly configurationFields: readonly string[];
    readonly retryable: boolean;
    constructor(code: ChatbotAiErrorCode, configurationFields?: readonly string[]);
}
export declare function normalizeChatbotError(error: unknown, signal?: AbortSignal): ChatbotAiError;
export {};
