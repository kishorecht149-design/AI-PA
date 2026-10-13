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
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B (Free)",
    provider: "openrouter",
    isFree: true,
    contextLength: 262144,
    description: "General-purpose planning, multilingual conversation, and document understanding.",
  },
  {
    id: "thinkingmachines/inkling:free",
    name: "Thinking Machines Inkling (Free)",
    provider: "openrouter",
    isFree: true,
    contextLength: 1048576,
    description: "Multimodal conversations, circuit/system diagram analysis, and agent-style workflows.",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "NVIDIA Nemotron 3 Ultra (Free)",
    provider: "openrouter",
    isFree: true,
    contextLength: 1000000,
    description: "Complex long-horizon planning, exam prep roadmaps, and multi-step tool orchestration.",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA Nemotron 3.5 Lightning (Free)",
    provider: "openrouter",
    isFree: true,
    contextLength: 1000000,
    description: "Ultra-fast MoE reasoning for instant study partner dialogues and technical Q&A.",
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
    const key = typeof apiKey === "string" ? apiKey : this.openRouterKey;
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
    // 1. Fetch user profile and memories to enrich personal context
    const [user, memories] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      prisma.aIMemory.findMany({
        where: { userId, isApproved: true },
        take: 10,
      }),
    ]);

    const userName = user?.name || "Kishore";
    const memoryContext =
      memories.length > 0
        ? `\n[Personal Knowledge & Memory]:\n` +
          memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")
        : "";

    // 2. Build friendly, personal learning partner system prompt
    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are AMAHAS, ${userName}'s personal AI learning partner, engineering mentor, and friendly study companion.

Your Personality & Voice:
- You are a real conversational partner: warm, engaging, thoughtful, motivating, and intellectually sharp.
- NEVER sound like a rigid script or robotic database reporter. Be natural, supportive, and conversational.
- When ${userName} greets you (e.g. "hello", "hey bro", "good morning"), respond warmly and casually like a good friend and study partner who is excited to collaborate.
- When tackling academic topics (GATE/ESE, ECE, CS, math, programming, circuits), explain concepts intuitively with clear steps, helpful examples, and constructive advice.
- When planning, give actionable suggestions and celebrate study streaks together.

Capabilities & Site Customization:
- You have authorized tools to view ${userName}'s tasks, courses, syllabus, and study progress.
- You CAN and SHOULD customize the website and dashboard when ${userName} asks! If ${userName} asks to create or organize sections on the dashboard (such as creating a "Resources" section with folders for "Video Links", "Online Materials", "Books", "Information"), USE the 'customize_dashboard_section' tool.
- Never claim "I cannot modify your dashboard" — you have real tools to create dashboard sections, resource folders, and custom hubs.

Live Web Search Engine & Research:
- You are equipped with a live web search engine ('search_web') and webpage reader ('fetch_webpage_content').
- You CAN and SHOULD act as an intelligent search engine across websites and the live internet!
- Whenever ${userName} asks about live web information, latest tech, documentation, external websites, online tutorials, research papers, or real-time facts across the web, USE the 'search_web' tool to query the internet.
- Provide clean, comprehensive answers synthesized from the search results, citing relevant webpage titles and URLs so ${userName} can easily navigate to the sources.
- If ${userName} asks you to read or summarize a specific webpage URL, USE the 'fetch_webpage_content' tool.
- Only present detailed academic metrics or task lists when ${userName} specifically asks for them or when context naturally calls for it.${memoryContext}`,
    };

    const finalMessages = [systemPrompt, ...messages];

    // 3. OpenRouter with resilient multi-model fallback
    if (this.openRouterKey) {
      const modelsToTry = [
        modelId,
        "openrouter/free",
        "nvidia/nemotron-3.5-lightning:free",
        "google/gemma-4-31b-it:free",
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      for (const currentModel of modelsToTry) {
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
              model: currentModel,
              messages: finalMessages,
              temperature,
              tools: this.getToolSchemas(),
              tool_choice: "auto",
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.warn(`OpenRouter model '${currentModel}' returned HTTP ${response.status}: ${errText.slice(0, 100)}`);
            // Automatically try next candidate if current model hit rate limits or errors
            continue;
          }

          const result = await response.json();
          const choice = result.choices?.[0];
          if (choice?.message) {
            const assistantMsg: ChatMessage = choice.message;

            // Handle tool calls if any
            if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
              const toolCalls = assistantMsg.tool_calls;
              const hasMutatingTool = toolCalls.some((tc: any) => {
                const def = APPLICATION_TOOLS[tc.function?.name];
                return def && !def.isReadOnly;
              });

              if (hasMutatingTool) {
                // Mutating action: Prepare confirmation card with friendly explanation
                const firstCall = toolCalls[0];
                const toolName = firstCall.function?.name;
                const readable = `I've prepared the ${toolName?.replace(/_/g, " ")} action for you. Please review and confirm below:`;
                assistantMsg.content = assistantMsg.content?.trim() || readable;
                return {
                  message: assistantMsg,
                  toolCalls: assistantMsg.tool_calls,
                  requiresConfirmation: true,
                };
              }

              // All tool calls are read-only: execute and feed results back to the model!
              const toolResultMessages: ChatMessage[] = [];
              const executedResults: any[] = [];

              for (const tc of toolCalls) {
                const toolName = tc.function?.name;
                const toolDef = APPLICATION_TOOLS[toolName];
                if (toolDef) {
                  let args = {};
                  try {
                    args = JSON.parse(tc.function?.arguments || "{}");
                  } catch {
                    args = {};
                  }
                  const execResult = await toolDef.execute(userId, args);
                  executedResults.push({ toolName, result: execResult });
                  toolResultMessages.push({
                    role: "tool",
                    name: toolName,
                    tool_call_id: tc.id,
                    content: typeof execResult === "string" ? execResult : JSON.stringify(execResult),
                  });
                }
              }

              // Send tool outputs back to OpenRouter to get the real conversational response!
              try {
                const followUpResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.openRouterKey}`,
                    "HTTP-Referer": "https://amahas.internal",
                    "X-Title": "AMAHAS Personal Operating System",
                  },
                  body: JSON.stringify({
                    model: currentModel,
                    messages: [...finalMessages, assistantMsg, ...toolResultMessages],
                    tools: this.getToolSchemas(),
                    tool_choice: "none",
                    temperature,
                  }),
                });

                if (followUpResponse.ok) {
                  const followUpResult = await followUpResponse.json();
                  const finalMsg = followUpResult.choices?.[0]?.message;
                  if (finalMsg) {
                    const cleanContent = (finalMsg.content || "")
                      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
                      .trim();

                    if (cleanContent) {
                      finalMsg.content = cleanContent;
                      return {
                        message: finalMsg,
                        toolCalls: assistantMsg.tool_calls,
                        requiresConfirmation: false,
                        executedToolResults: executedResults,
                      };
                    }
                  }
                }
              } catch (followUpErr: any) {
                console.warn("Follow-up completion with tool results failed:", followUpErr.message);
              }
            }

            if (assistantMsg.content?.trim()) {
              return { message: assistantMsg };
            }
          }
        } catch (err: any) {
          console.warn(`Error attempting model '${currentModel}':`, err.message);
        }
      }
    }

    // 4. Resilient Offline Learning Partner Fallback
    const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";

    // Casual friendly greetings
    if (/^(hi|hello|hey|yo|greetings|good morning|good evening|howdy)/i.test(lastUserMsg.trim())) {
      return {
        message: {
          role: "assistant",
          content: `Hey ${userName}! Great to see you. I'm right here with you—ready to dive into some study topics, organize today's schedule, or talk through whatever you're working on. What are we focusing on today?`,
        },
      };
    }

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
          content: `Here are your current high-priority tasks, ${userName}:\n\n${taskList}\n\nWould you like me to schedule a focused study block for one of these, or break a topic down into bite-sized steps?`,
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
          content: `Here is a quick snapshot of your active courses, ${userName}:\n\n${courseSummary}\n\nShall we schedule a timed revision session using the SuperMemo SM-2 algorithm for your weak topics today?`,
        },
      };
    }

    return {
      message: {
        role: "assistant",
        content: `I'm here with you, ${userName}! As your personal study partner, I can help you plan your week, explain challenging engineering concepts, drill flashcards, or track research projects.\n\nWhat would you like to tackle next?`,
      },
    };
  }
}

export const aiGateway = new AIGateway();
