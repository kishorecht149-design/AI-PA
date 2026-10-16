import type { AIProvider, ProviderHealth } from "./types.ts";
import { OpenRouterProvider } from "./openrouter-provider.ts";
import { OllamaProvider } from "./ollama-provider.ts";

export type * from "./types.ts";
export * from "./openrouter-provider.ts";
export * from "./ollama-provider.ts";

export class ProviderManager {
  private openRouter: OpenRouterProvider;
  private ollama: OllamaProvider;

  constructor() {
    this.openRouter = new OpenRouterProvider();
    this.ollama = new OllamaProvider();
  }

  public getProviderForModel(modelId: string): AIProvider {
    if (modelId.startsWith("ollama/")) {
      return this.ollama;
    }
    return this.openRouter;
  }

  public async checkHealth(): Promise<{
    openrouter: ProviderHealth;
    ollama: ProviderHealth;
  }> {
    const [openrouterHealth, ollamaHealth] = await Promise.all([
      this.openRouter.checkHealth(),
      this.ollama.checkHealth(),
    ]);

    return {
      openrouter: openrouterHealth,
      ollama: ollamaHealth,
    };
  }
}

export const providerManager = new ProviderManager();
