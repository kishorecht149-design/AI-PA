import { APPLICATION_TOOLS, type ToolDefinition } from "./tools-registry.ts";
import { prisma } from "./prisma.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ModelMetadata {
  id: string;
  name: string;
  provider: "openrouter" | "ollama";
  isFree: boolean;
  contextLength?: number;
  description?: string;
}

export const KNOWN_FREE_MODELS: ModelMetadata[] = [
  {
    id: "openrouter/free",
    name: "OpenRouter Free Router (Auto-selects available free model)",
    provider: "openrouter",
    isFree: true,
    contextLength: 32768,
    description: "Automatically routes requests to the best available free model variant.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct (Free)",
    provider: "openrouter",
    isFree: true,
    contextLength: 131072,
    description: "State-of-the-art open reasoning, engineering & mathematics.",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free Experimental)",
    provider: "openrouter",
    isFree: true,
    contextLength: 1048576,
    description: "Ultra-fast multimodal and large context reasoning.",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    name: "Qwen 2.5 72B Instruct (Free)",
    provider: "openrouter",
    isFree: true,
    contextLength: 32768,
    description: "Excellent coding, mathematics, and multilingual support.",
  },
  {
    id: "ollama/llama3.2",
    name: "Ollama Local (llama3.2)",
    provider: "ollama",
    isFree: true,
    contextLength: 8192,
    description: "Local private execution on your machine with zero external network data transfer.",
  },
];

/**
 * AI Gateway orchestrating OpenRouter and Ollama with tool-calling capabilities.
 */
export class AIGateway {
  private openRouterKey: string;
  private ollamaBaseUrl: string;

  constructor() {
    this.openRouterKey = process.env.OPENROUTER_API_KEY || "";
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  /**
   * Check connection status of OpenRouter.
   */
  async testOpenRouterConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    const key = apiKey || this.openRouterKey;
    if (!key) {
      return { success: false, message: "No OpenRouter API key configured. Provide OPENROUTER_API_KEY or enter key in Settings." };
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, message: `OpenRouter authorization error: ${res.status} ${errorText}` };
      }

      const data = await res.json();
      return {
        success: true,
        message: `Connected successfully to OpenRouter. Limit: ${data.data?.limit || "Standard"}, Usage: ${data.data?.usage || 0}`,
      };
    } catch (err: any) {
      return { success: false, message: `Failed to connect to OpenRouter: ${err.message}` };
    }
  }

  /**
   * Check connection status of Ollama local daemon.
   */
  async testOllamaConnection(baseUrl?: string): Promise<{ success: boolean; models: string[]; message: string }> {
    const url = baseUrl || this.ollamaBaseUrl;
    try {
      const res = await fetch(`${url}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        return { success: false, models: [], message: `Ollama returned HTTP ${res.status}` };
      }
      const data = await res.json();
      const modelNames = (data.models || []).map((m: any) => m.name);
      return {
        success: true,
        models: modelNames,
        message: `Connected to Ollama on ${url}. Available local models: ${modelNames.join(", ") || "none"}`,
      };
    } catch (err: any) {
      return {
        success: false,
        models: [],
        message: `Local Ollama instance not reachable at ${url} (${err.message}). Start Ollama with 'ollama serve' to enable local inference.`,
      };
    }
  }

  /**
   * Convert tools to OpenAI / OpenRouter function schema format.
   */
  getToolSchemas() {
    return Object.values(APPLICATION_TOOLS).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Send chat completion with tool calling support.
   */
  async chat({
    userId,
    messages,
    modelId = "openrouter/free",
    temperature = 0.7,
  }: {
    userId: string;
    messages: ChatMessage[];
    modelId?: string;
    temperature?: number;
  }): Promise<{
    message: ChatMessage;
    toolCalls?: any[];
    requiresConfirmation?: boolean;
    executedToolResults?: any[];
  }> {
    // 1. Fetch user memories to enrich context
    const memories = await prisma.aIMemory.findMany({
      where: { userId, isApproved: true },
      take: 10,
    });
    const memoryContext =
      memories.length > 0
        ? `\n[User Verified Facts & Context]:\n` +
          memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")
        : "";

    // 2. Build system prompt
    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are AMAHAS (Autonomous Multimodal Holographic Assistant System), the student's personal operating system assistant.
Your student is preparing for college coursework, engineering competitive examinations (GATE/ESE), technical research, languages, and high-discipline personal growth.
Always be encouraging, precise, mathematically rigorous, and action-oriented.
You have access to authorized tools to read tasks, course syllabi, notes, research papers, and schedule details.
Never hallucinate grades, citations, or database updates. Use tools when you need actual records.
Explain what you do concisely.${memoryContext}`,
    };

    const finalMessages = [systemPrompt, ...messages];

    // Check if OpenRouter key is available
    if (this.openRouterKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openRouterKey}`,
            "HTTP-Referer": "https://amahas.internal",
            "X-Title": "AMAHAS Personal Operating System",
          },
          body: JSON.stringify({
            model: modelId,
            messages: finalMessages,
            temperature,
            tools: this.getToolSchemas(),
            tool_choice: "auto",
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const choice = result.choices?.[0];
          if (choice?.message) {
            const assistantMsg: ChatMessage = choice.message;

            // Handle tool calls if any
            if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
              const toolCall = assistantMsg.tool_calls[0];
              const toolName = toolCall.function?.name;
              const toolDef = APPLICATION_TOOLS[toolName];

              if (toolDef) {
                let args = {};
                try {
                  args = JSON.parse(toolCall.function.arguments || "{}");
                } catch {
                  args = {};
                }

                // If tool is read-only, execute automatically
                if (toolDef.isReadOnly) {
                  const execResult = await toolDef.execute(userId, args);
                  return {
                    message: assistantMsg,
                    toolCalls: assistantMsg.tool_calls,
                    requiresConfirmation: false,
                    executedToolResults: [{ toolName, result: execResult }],
                  };
                } else {
                  // Tool mutates state: requires user confirmation
                  return {
                    message: assistantMsg,
                    toolCalls: assistantMsg.tool_calls,
                    requiresConfirmation: true,
                  };
                }
              }
            }

            return { message: assistantMsg };
          }
        }
      } catch (err) {
        console.warn("OpenRouter API call encountered error, falling back to deterministic student intelligence:", err);
      }
    }

    // 3. Resilient Deterministic Fallback
    // Provides immediate, coherent answers when no external API key is set
    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";

    if (lastUserMsg.includes("task") || lastUserMsg.includes("todo") || lastUserMsg.includes("homework")) {
      const tasks = await prisma.task.findMany({
        where: { userId, status: "TODO" },
        take: 5,
        orderBy: { priority: "desc" },
      });
      const taskList = tasks.map((t) => `• [${t.priority}] ${t.title}`).join("\n") || "No pending tasks found.";
      return {
        message: {
          role: "assistant",
          content: `Here are your current high-priority tasks in AMAHAS:\n\n${taskList}\n\nWould you like me to schedule a focus session for one of these, or break a syllabus topic down into actionable subtasks?`,
        },
      };
    }

    if (lastUserMsg.includes("gate") || lastUserMsg.includes("course") || lastUserMsg.includes("syllabus") || lastUserMsg.includes("exam")) {
      const courses = await prisma.course.findMany({
        where: { userId },
        include: { units: { include: { topics: true } } },
      });
      const courseSummary = courses.map((c) => {
        const topics = c.units.flatMap((u) => u.topics);
        const mastered = topics.filter((t) => t.status === "MASTERED").length;
        return `• **${c.code} (${c.name})**: ${mastered}/${topics.length} topics mastered (Confidence: ${c.confidence}/5)`;
      }).join("\n") || "No courses registered yet.";

      return {
        message: {
          role: "assistant",
          content: `Here is your current academic and exam preparation overview:\n\n${courseSummary}\n\nShall we schedule a timed revision session using the SuperMemo SM-2 algorithm for your weak topics today?`,
        },
      };
    }

    return {
      message: {
        role: "assistant",
        content: `I am your AMAHAS Assistant. I am ready to coordinate your schedule, organize your engineering coursework, track research experiments, and drill spaced-repetition flashcards.\n\n*Tip: Connect your OpenRouter API key in **Settings > AI Models** to enable open-ended reasoning with models like Llama 3.3 70B or Gemini 2.0 Flash.*`,
      },
    };
  }
}

export const aiGateway = new AIGateway();
