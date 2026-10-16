import type {
  AIProvider,
  ChatMessage,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderHealth,
} from "./types.ts";

export class OpenRouterProvider implements AIProvider {
  public id = "openrouter" as const;
  public name = "OpenRouter Cloud Gateway";
  private apiKey: string;
  private endpoint = "https://openrouter.ai/api/v1/chat/completions";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
  }

  /**
   * Health check to verify OpenRouter connectivity and key validity.
   */
  async checkHealth(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        provider: "openrouter",
        available: false,
        message:
          "OpenRouter API key is not configured. Set OPENROUTER_API_KEY in your environment.",
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) {
        return {
          provider: "openrouter",
          available: false,
          message: `OpenRouter authentication check returned HTTP ${res.status}. Verify key validity.`,
        };
      }

      const data = await res.json();
      return {
        provider: "openrouter",
        available: true,
        latencyMs: Date.now() - startTime,
        message: `Connected to OpenRouter. Tier: ${data?.data?.limit != null ? "Active" : "Standard"}.`,
      };
    } catch (err: any) {
      return {
        provider: "openrouter",
        available: false,
        message: `Failed to connect to OpenRouter (${err.message}). Check internet connectivity.`,
      };
    }
  }

  /**
   * Execute chat completion via OpenRouter with multi-model fallback across the free tier.
   */
  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    if (!this.apiKey) {
      throw new Error(
        "OpenRouter API key is not configured. Please supply OPENROUTER_API_KEY."
      );
    }

    const requestedModel = request.modelId || "openrouter/free";
    const modelsToTry = [
      requestedModel,
      "openrouter/free",
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const payload: any = {
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
        };

        if (request.tools && request.tools.length > 0) {
          payload.tools = request.tools;
          payload.tool_choice = "auto";
        }

        const res = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://amahas.internal",
            "X-Title": "AMAHAS Personal Operating System",
          },
          body: JSON.stringify(payload),
          signal: request.signal || AbortSignal.timeout(12000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          lastError = new Error(
            `OpenRouter model '${model}' returned HTTP ${res.status}: ${errText.slice(0, 100)}`
          );
          continue; // Try next candidate free model
        }

        const data = await res.json();
        const choice = data.choices?.[0];

        if (choice?.message) {
          return {
            message: choice.message,
            toolCalls: choice.message.tool_calls,
            modelUsed: model,
            provider: "openrouter",
          };
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error("All candidate OpenRouter models failed to respond.");
  }
}
