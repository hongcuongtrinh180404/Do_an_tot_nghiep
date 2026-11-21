import type OpenAI from 'openai';
import { type ChatbotConfig } from './chatbot.config.js';
import type { ChatbotCompletionInput, ChatbotCompletionResult } from './chatbot.types.js';
export declare class ChatbotAiClient {
    private readonly config;
    private readonly client;
    private readonly logger;
    constructor(config: ChatbotConfig, client: OpenAI | null);
    complete(input: ChatbotCompletionInput): Promise<ChatbotCompletionResult>;
    private readResponse;
}
