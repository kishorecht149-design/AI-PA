import { prisma } from "../prisma";
import { aiGateway } from "../ai-gateway";

export interface ConnectorMeta {
  provider: string;
  name: string;
  category: "ai" | "research" | "knowledge" | "tasks" | "automation";
  description: string;
  isExternal: boolean;
  requiresApiKey: boolean;
  defaultEndpoint?: string;
  setupInstructions: string;
}

export const CONNECTOR_CATALOG: ConnectorMeta[] = [
  {
    provider: "OPENROUTER",
    name: "OpenRouter AI Gateway",
    category: "ai",
    description: "Primary gateway for hosted AI models, prioritizing free routers (openrouter/free, Llama 3.3 70B, Gemini 2.0 Flash).",
    isExternal: true,
    requiresApiKey: true,
    defaultEndpoint: "https://openrouter.ai/api/v1",
    setupInstructions: "Obtain an API key from https://openrouter.ai/keys and add it to OPENROUTER_API_KEY in your environment or below.",
  },
  {
    provider: "OLLAMA",
    name: "Ollama (Local Private AI)",
    category: "ai",
    description: "Run open-source models (Llama 3.2, Qwen 2.5) locally on your hardware with 100% offline privacy.",
    isExternal: false,
    requiresApiKey: false,
    defaultEndpoint: "http://localhost:11434",
    setupInstructions: "Run 'ollama serve' in your local terminal. AMAHAS will detect available downloaded models.",
  },
  {
    provider: "OPENALEX",
    name: "OpenAlex Research Works",
    category: "research",
    description: "Access over 250 million scholarly publications, citation graphs, and author metadata.",
    isExternal: true,
    requiresApiKey: false,
    defaultEndpoint: "https://api.openalex.org",
    setupInstructions: "No API key required. Uses polite user-agent pool with your configured student email.",
  },
  {
    provider: "ARXIV",
    name: "arXiv Open Preprints",
    category: "research",
    description: "Live search over preprints across Computer Science, Electrical Engineering, Mathematics, and Physics.",
    isExternal: true,
    requiresApiKey: false,
    defaultEndpoint: "http://export.arxiv.org/api/query",
    setupInstructions: "No API key required. Direct open queries enabled.",
  },
  {
    provider: "WIKIPEDIA",
    name: "Wikipedia & Wikidata Knowledge",
    category: "knowledge",
    description: "Verified encyclopedic concept lookup and background learning for general knowledge modules.",
    isExternal: true,
    requiresApiKey: false,
    defaultEndpoint: "https://en.wikipedia.org/w/api.php",
    setupInstructions: "Free public access using MediaWiki API.",
  },
  {
    provider: "VIKUNJA",
    name: "Vikunja Task Engine",
    category: "tasks",
    description: "Optional bidirectional sync with self-hosted or cloud Vikunja task instances.",
    isExternal: true,
    requiresApiKey: true,
    defaultEndpoint: "https://app.vikunja.io/api/v1",
    setupInstructions: "Generate a personal API token in your Vikunja User Settings > API Tokens.",
  },
  {
    provider: "N8N",
    name: "n8n Workflow Automation",
    category: "automation",
    description: "Optional connector to dispatch webhooks and trigger external automation sequences.",
    isExternal: true,
    requiresApiKey: true,
    defaultEndpoint: "http://localhost:5678",
    setupInstructions: "Configure your n8n webhook URL or REST API key to bridge student life events.",
  },
  {
    provider: "GITHUB",
    name: "GitHub Repositories & Commits",
    category: "research",
    description: "Link code repositories to technical projects and research experiments.",
    isExternal: true,
    requiresApiKey: true,
    defaultEndpoint: "https://api.github.com",
    setupInstructions: "Create a GitHub Personal Access Token (classic or fine-grained) with 'repo' scope.",
  },
];

/**
 * Test a connector's connection.
 */
export async function testConnector(
  provider: string,
  config: { apiKey?: string; endpoint?: string }
): Promise<{ success: boolean; message: string }> {
  switch (provider) {
    case "OPENROUTER":
      return aiGateway.testOpenRouterConnection(config.apiKey);

    case "OLLAMA":
      const res = await aiGateway.testOllamaConnection(config.endpoint);
      return { success: res.success, message: res.message };

    case "OPENALEX":
      try {
        const ping = await fetch("https://api.openalex.org/works?per-page=1", {
          signal: AbortSignal.timeout(4000),
        });
        return {
          success: ping.ok,
          message: ping.ok
            ? "Successfully reached OpenAlex API."
            : `OpenAlex returned HTTP ${ping.status}`,
        };
      } catch (e: any) {
        return { success: false, message: `Could not reach OpenAlex: ${e.message}` };
      }

    case "ARXIV":
      try {
        const ping = await fetch(
          "http://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=1",
          { signal: AbortSignal.timeout(4000) }
        );
        return {
          success: ping.ok,
          message: ping.ok ? "Successfully reached arXiv API." : `arXiv returned HTTP ${ping.status}`,
        };
      } catch (e: any) {
        return { success: false, message: `Could not reach arXiv: ${e.message}` };
      }

    case "WIKIPEDIA":
      try {
        const ping = await fetch(
          "https://en.wikipedia.org/w/api.php?action=query&titles=Computer_science&format=json&origin=*",
          { signal: AbortSignal.timeout(4000) }
        );
        return {
          success: ping.ok,
          message: ping.ok ? "Successfully connected to Wikipedia API." : `Wikipedia returned HTTP ${ping.status}`,
        };
      } catch (e: any) {
        return { success: false, message: `Could not reach Wikipedia: ${e.message}` };
      }

    default:
      return {
        success: false,
        message: `Connector '${provider}' requires external configuration endpoint and authorization.`,
      };
  }
}
