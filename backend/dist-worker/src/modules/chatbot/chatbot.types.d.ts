import type OpenAI from 'openai';
export type ChatbotToolDefinition = OpenAI.Chat.Completions.ChatCompletionFunctionTool;
export type ChatbotToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;
export interface ChatbotAssistantMessage {
    role: 'assistant';
    content: string | null;
    tool_calls?: ChatbotToolCall[];
    reasoning_content?: string;
}
export type ChatbotMessage = {
    role: 'system' | 'user';
    content: string;
} | ChatbotAssistantMessage | {
    role: 'tool';
    content: string;
    tool_call_id: string;
};
export interface ChatbotCompletionInput {
    messages: readonly ChatbotMessage[];
    tools?: readonly ChatbotToolDefinition[];
    toolChoice?: 'auto' | 'none';
    signal?: AbortSignal;
    requestId?: string;
}
export interface ChatbotCompletionResult {
    assistantMessage: ChatbotAssistantMessage;
    finishReason: 'stop' | 'tool_calls';
    model: string;
    requestId: string;
    providerResponseId: string;
    durationMs: number;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
