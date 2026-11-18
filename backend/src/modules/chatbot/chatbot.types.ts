import type OpenAI from 'openai';

export type ChatbotToolDefinition =
  OpenAI.Chat.Completions.ChatCompletionFunctionTool;
export type ChatbotToolCall =
  OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;

/** Internal protocol message; do not expose reasoning_content through a future HTTP API. */
export interface ChatbotAssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ChatbotToolCall[];
  reasoning_content?: string;
}

export type ChatbotMessage =
  | { role: 'system' | 'user'; content: string }
  | ChatbotAssistantMessage
  | { role: 'tool'; content: string; tool_call_id: string };

export interface ChatbotCompletionInput {
  /** Server-built history, not an unvalidated array of client-supplied roles. */
  messages: readonly ChatbotMessage[];
  tools?: readonly ChatbotToolDefinition[];
  toolChoice?: 'auto' | 'none';
  signal?: AbortSignal;
  /** A server-generated UUID; invalid values are replaced with a new UUID. */
  requestId?: string;
}

export interface ChatbotCompletionResult {
  /** Append this message unchanged before supplying the matching tool results. */
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
