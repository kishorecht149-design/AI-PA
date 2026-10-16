import type {
  AIProvider,
  ChatMessage,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderHealth,
} from "./types.ts";

export class OllamaProvider implements AIProvider {
  public id = "ollama" as const;
  public name = "Ollama (Local Private AI)";
  private defaultBaseUrl: string;

  constructor() {
    this.defaultBaseUrl =
      process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  public getBaseUrl(overrideUrl?: string): string {
    const raw = overrideUrl || this.defaultBaseUrl;
    return raw.replace(/\/+$/, "");
  }

  /**
   * Health check to detect if local Ollama daemon is active and responsive.
   * Handles local vs remote Vercel environments safely.
   */
  async checkHealth(overrideUrl?: string): Promise<ProviderHealth> {
    const baseUrl = this.getBaseUrl(overrideUrl);
    const isVercel = process.env.VERCEL === "1";
    const isLocalAddress =
      baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

    // Guard: Remote Vercel serverless function cannot reach user's local Mac loopback
    if (isVercel && isLocalAddress) {
      return {
        provider: "ollama",
        available: false,
        message:
          "Ollama runs on your local Mac. In cloud-hosted Vercel environments, AMAHAS uses cloud models or an authorized secure tunnel (Tailscale / Cloudflare Tunnel).",
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });

      if (!res.ok) {
        return {
          provider: "ollama",
          available: false,
          message: `Ollama returned status ${res.status}. Ensure daemon is running properly.`,
        };
      }

      const data = await res.json();
      const models = Array.isArray(data.models)
        ? data.models.map((m: any) => m.name || m.model)
        : [];

      return {
        provider: "ollama",
        available: true,
        latencyMs: Date.now() - startTime,
        models,
        message: `Connected to Ollama at ${baseUrl}. ${models.length} model(s) installed.`,
      };
    } catch (err: any) {
      return {
        provider: "ollama",
        available: false,
        message: `Local Ollama is offline or unreachable at ${baseUrl} (${err.message}). Run 'ollama serve' in your macOS terminal to enable local inference.`,
      };
    }
  }

  /**
   * Execute chat completion via Ollama's native /api/chat endpoint.
   */
  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const baseUrl = this.getBaseUrl();
    const cleanModel = request.modelId.replace(/^ollama\//, "") || "llama3.2";

    // Format messages for Ollama API
    const formattedMessages = request.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cleanModel,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
          },
        }),
        signal: request.signal || controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `Ollama returned HTTP ${res.status}: ${errorText.slice(0, 150)}`
        );
      }

      const data = await res.json();
      const outputMessage: ChatMessage = {
        role: "assistant",
        content: data.message?.content || "Completed successfully.",
      };

      return {
        message: outputMessage,
        modelUsed: cleanModel,
        provider: "ollama",
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(
        `Ollama local inference failed: ${err.message}. To resolve: start Ollama with 'ollama serve' and ensure model '${cleanModel}' is downloaded ('ollama run ${cleanModel}').`
      );
    }
  }
}
