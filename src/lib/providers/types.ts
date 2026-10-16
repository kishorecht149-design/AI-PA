export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ProviderChatRequest {
  messages: ChatMessage[];
  modelId: string;
  temperature?: number;
  tools?: any[];
  signal?: AbortSignal;
}

export interface ProviderChatResponse {
  message: ChatMessage;
  toolCalls?: any[];
  modelUsed: string;
  provider: "openrouter" | "ollama" | "fallback";
}

export interface ProviderHealth {
  provider: "openrouter" | "ollama";
  available: boolean;
  message: string;
  models?: string[];
  latencyMs?: number;
}

export interface AIProvider {
  id: "openrouter" | "ollama";
  name: string;
  checkHealth: (baseUrl?: string) => Promise<ProviderHealth>;
  chat: (request: ProviderChatRequest) => Promise<ProviderChatResponse>;
}
