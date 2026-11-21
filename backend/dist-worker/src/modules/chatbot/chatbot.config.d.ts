import Joi from 'joi';
export declare const CHATBOT_CONFIG: unique symbol;
export declare const CHATBOT_OPENAI_CLIENT: unique symbol;
export declare const CHATBOT_ENV_KEYS: readonly ["CHATBOT_ENABLED", "CHATBOT_API_KEY", "CHATBOT_BASE_URL", "CHATBOT_MODEL", "CHATBOT_TIMEOUT_MS", "CHATBOT_MAX_OUTPUT_TOKENS"];
export declare const chatbotEnvSchema: Joi.ObjectSchema<any>;
export interface ChatbotConfig {
    readonly enabled: boolean;
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly model: string;
    readonly timeoutMs: number;
    readonly maxOutputTokens: number;
}
export declare function parseChatbotConfig(env: Record<string, unknown>): ChatbotConfig;
