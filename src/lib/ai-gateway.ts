import {
  APPLICATION_TOOLS,
  RESEARCH_TOOLS,
  ALL_TOOLS,
  getToolsForIntent,
  validateToolArgs,
  type ToolDefinition,
} from "./tools-registry.ts";
import { prisma } from "./prisma.ts";
import { providerManager } from "./providers/index.ts";
import { classifyIntent, type IntentRouteResult } from "./intent-router.ts";
import { decodeHtmlEntities } from "./format-utils.ts";
import { assistantEngine, type ExecutionPlan, type ExecutionState } from "./assistant-engine.ts";
import { generateConfirmationToken } from "./tool-confirmation.ts";

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
 * AI Gateway orchestrating OpenRouter and Ollama with strict intent routing
 * and separated tool execution pipelines.
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
    const ollama = providerManager.getProviderForModel("ollama/default");
    const health = await ollama.checkHealth(baseUrl);
    return {
      success: health.available,
      models: health.models || [],
      message: health.message,
    };
  }

  /**
   * Convert specific tool map to OpenAI / OpenRouter function schema format.
   */
  getToolSchemas(toolMap: Record<string, ToolDefinition>) {
    const tools = Object.values(toolMap);
    if (tools.length === 0) return undefined;
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Send chat completion with explicit intent classification,
   * safe action execution, and zero default web search.
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
    confirmationToken?: string;
    executedToolResults?: any[];
    plan?: ExecutionPlan;
    executionState?: ExecutionState;
  }> {
    // 1. Fetch user profile and approved memories
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

    // 2. Classify intent BEFORE selecting any tools
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const intentResult: IntentRouteResult = classifyIntent(lastUserMessage);

    // -------------------------------------------------------------------------
    // CASE A: CLARIFICATION_REQUIRED
    // When intent is ambiguous (e.g. "Edit the Academics section"), ask the user
    // for clarification directly. DO NOT invoke web search!
    // -------------------------------------------------------------------------
    if (intentResult.intent === "clarification_required") {
      return {
        message: {
          role: "assistant",
          content:
            intentResult.clarificationMessage ||
            `I'd be glad to help you modify this section, ${userName}. What specific change would you like to make?`,
        },
      };
    }

    // -------------------------------------------------------------------------
    // CASE B: AUTONOMOUS ASSISTANT ENGINE (Bounded Workflow Planning & Execution)
    // -------------------------------------------------------------------------
    const userContext = await assistantEngine.resolveUserContext(userId);
    const workflowPlanning = await assistantEngine.planWorkflow(
      userId,
      lastUserMessage,
      intentResult,
      userContext
    );

    if (workflowPlanning.clarification) {
      return {
        message: {
          role: "assistant",
          content: workflowPlanning.clarification,
        },
        executionState: "completed",
        requiresConfirmation: false,
      };
    }

    if (workflowPlanning.plan) {
      const execution = await assistantEngine.executePlan(workflowPlanning.plan, userId);
      const content = assistantEngine.synthesizeResponse(execution.plan, userName);
      let toolCalls: any[] | undefined = undefined;
      if (execution.requiresConfirmation) {
        const step = execution.plan.steps[execution.plan.currentStepIndex];
        toolCalls = [
          {
            id: `call_${Date.now()}`,
            function: {
              name: step.toolName,
              arguments: JSON.stringify(step.args),
            },
          },
        ];
      }
      return {
        message: {
          role: "assistant",
          content,
        },
        plan: execution.plan,
        executionState: execution.plan.state,
        executedToolResults: execution.executedResults,
        requiresConfirmation: execution.requiresConfirmation,
        confirmationToken: execution.confirmationToken,
        toolCalls,
      };
    }

    // -------------------------------------------------------------------------
    // 3. Build strictly scoped tools according to Intent
    // -------------------------------------------------------------------------
    const allowedToolsMap = getToolsForIntent(intentResult.intent);
    const toolSchemas = this.getToolSchemas(allowedToolsMap);

    // 4. Construct intent-aware system prompt
    let domainGuidance = "";
    if (intentResult.intent === "application_action" || intentResult.intent === "application_query") {
      domainGuidance = `
Current Task Context: APPLICATION INTERACTION (${intentResult.intent}).
- The user is interacting with their actual AMAHAS workspace data (Courses, Academics, Tasks).
- DO NOT search the web. Use the provided application tools to read or update their real data.
- When an operation succeeds, clearly summarize what changed (e.g. Course code, title, status).
- Never report simulated changes; only report actual outcomes confirmed by the application tools.`;
    } else if (intentResult.intent === "task_management") {
      domainGuidance = `
Current Task Context: TASK & REMINDER MANAGEMENT.
- You have tools to search, create, and update tasks and reminders.
- Use application tools to inspect or modify tasks. Do not invoke web search.`;
    } else if (intentResult.intent === "web_research") {
      domainGuidance = `
Current Task Context: LIVE WEB RESEARCH.
- The user explicitly requested external web research or latest public information.
- Use 'search_web' to retrieve authentic sources, and cite the resulting webpage titles and URLs cleanly.`;
    } else {
      domainGuidance = `
Current Task Context: CONVERSATIONAL & EDUCATIONAL TUTORING (General Chat).
- Explain technical, mathematical, and engineering concepts intuitively with clear steps and rigorous derivations.
- DO NOT call web search or application modification tools for general questions unless explicitly asked.`;
    }

    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are AMAHAS, an autonomous workspace intelligence partner and academic mentor for ${userName}.

Your Personality & Voice:
- Articulate, thoughtful, objective, clear, and intellectually sharp.
- NEVER sound like a robotic database dumper. Be natural, supportive, and conversational.
- When explaining engineering concepts, explain them intuitively with clear steps and practical intuition.
- When modifying workspace resources, report the exact fields updated and confirm success.${domainGuidance}${memoryContext}`,
    };

    const finalMessages = [systemPrompt, ...messages];

    // 5. Hybrid Local Inference via Ollama (if selected)
    if (modelId.startsWith("ollama/")) {
      const ollama = providerManager.getProviderForModel(modelId);
      const health = await ollama.checkHealth();
      if (health.available) {
        try {
          const res = await ollama.chat({
            messages: finalMessages,
            modelId,
            temperature,
          });
          return { message: res.message };
        } catch (ollamaErr: any) {
          console.warn(`[AIGateway] Local Ollama failed (${ollamaErr.message}). Failing over.`);
        }
      }
    }

    // 6. OpenRouter with filtered tool schemas
    if (this.openRouterKey) {
      const modelsToTry = [
        modelId.startsWith("ollama/") ? "openrouter/free" : modelId,
        "openrouter/free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemma-2-9b-it:free",
        "mistralai/mistral-7b-instruct:free",
        "deepseek/deepseek-r1:free",
        "qwen/qwen-2.5-72b-instruct:free",
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      for (const currentModel of modelsToTry) {
        try {
          const requestBody: any = {
            model: currentModel,
            messages: finalMessages,
            temperature,
          };

          if (toolSchemas && toolSchemas.length > 0) {
            requestBody.tools = toolSchemas;
            requestBody.tool_choice = "auto";
          }

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.openRouterKey}`,
              "HTTP-Referer": "https://amahas.internal",
              "X-Title": "AMAHAS Personal Operating System",
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(6500),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.warn(`OpenRouter model '${currentModel}' returned HTTP ${response.status}: ${errText.slice(0, 100)}`);
            continue;
          }

          const result = await response.json();
          const choice = result.choices?.[0];
          if (choice?.message) {
            const assistantMsg: ChatMessage = choice.message;

            // Handle tool calls if any
            if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
              const toolCalls = assistantMsg.tool_calls;

              // Check if any tool call is destructive (requires confirmation card)
              const hasDestructiveTool = toolCalls.some((tc: any) => {
                const def = ALL_TOOLS[tc.function?.name];
                return def && def.isDestructive;
              });

              if (hasDestructiveTool) {
                const firstCall = toolCalls[0];
                const toolName = firstCall.function?.name;
                let args = {};
                try {
                  args = JSON.parse(firstCall.function?.arguments || "{}");
                } catch {}
                const confirmationToken = generateConfirmationToken({
                  userId,
                  toolName,
                  args,
                });
                const readable = `I've prepared the ${toolName?.replace(/_/g, " ")} action. Because this is a destructive operation, please review and confirm below:`;
                assistantMsg.content = assistantMsg.content?.trim() || readable;
                return {
                  message: assistantMsg,
                  toolCalls: assistantMsg.tool_calls,
                  requiresConfirmation: true,
                  confirmationToken,
                };
              }

              // Execute permitted tools
              const toolResultMessages: ChatMessage[] = [];
              const executedResults: any[] = [];

              for (const tc of toolCalls) {
                const toolName = tc.function?.name;
                const toolDef = ALL_TOOLS[toolName];
                if (toolDef) {
                  let args = {};
                  try {
                    args = JSON.parse(tc.function?.arguments || "{}");
                  } catch {
                    args = {};
                  }

                  // Strict server-side argument validation
                  const validation = validateToolArgs(toolDef, args);
                  if (!validation.valid) {
                    const validationErr = `Invalid arguments for '${toolName}': ${validation.errors.join("; ")}`;
                    executedResults.push({ toolName, error: validationErr });
                    toolResultMessages.push({
                      role: "tool",
                      name: toolName,
                      tool_call_id: tc.id,
                      content: JSON.stringify({ error: validationErr }),
                    });
                    continue;
                  }

                  try {
                    const execResult = await toolDef.execute(userId, args);
                    executedResults.push({ toolName, result: execResult });
                    toolResultMessages.push({
                      role: "tool",
                      name: toolName,
                      tool_call_id: tc.id,
                      content: typeof execResult === "string" ? execResult : JSON.stringify(execResult),
                    });
                  } catch (toolExecErr: any) {
                    executedResults.push({ toolName, error: toolExecErr.message });
                    toolResultMessages.push({
                      role: "tool",
                      name: toolName,
                      tool_call_id: tc.id,
                      content: JSON.stringify({ error: toolExecErr.message }),
                    });
                  }
                }
              }

              // Send tool outputs back to OpenRouter for concise synthesis
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
                    temperature,
                  }),
                  signal: AbortSignal.timeout(6000),
                });

                if (followUpResponse.ok) {
                  const followUpResult = await followUpResponse.json();
                  const finalMsg = followUpResult.choices?.[0]?.message;
                  if (finalMsg?.content) {
                    finalMsg.content = decodeHtmlEntities(
                      finalMsg.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "").trim()
                    );
                    return {
                      message: finalMsg,
                      toolCalls: assistantMsg.tool_calls,
                      requiresConfirmation: false,
                      executedToolResults: executedResults,
                    };
                  }
                }
              } catch (followUpErr: any) {
                console.warn("Follow-up completion with tool results failed:", followUpErr.message);
              }

              // Fallback to presenting the direct tool outcome cleanly
              if (executedResults.length > 0) {
                const firstRes = executedResults[0];
                const cleanSummary = firstRes.result?.message || `Successfully executed ${firstRes.toolName}.`;
                return {
                  message: {
                    role: "assistant",
                    content: cleanSummary,
                  },
                  toolCalls: assistantMsg.tool_calls,
                  executedToolResults: executedResults,
                };
              }
            }

            if (assistantMsg.content?.trim()) {
              assistantMsg.content = decodeHtmlEntities(assistantMsg.content.trim());
              return { message: assistantMsg };
            }
          }
        } catch (err: any) {
          console.warn(`Error attempting model '${currentModel}':`, err.message);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 7. Deterministic Intent-Scoped Fallbacks (ZERO Unrelated Web Search!)
    // -------------------------------------------------------------------------
    const lowerUserMsg = lastUserMessage.toLowerCase().trim();

    // A. Application Query Fallback: Directly read real records from Prisma
    if (intentResult.intent === "application_query" || lowerUserMsg.includes("course") || lowerUserMsg.includes("syllabus")) {
      const courses = await prisma.course.findMany({
        where: { userId },
        include: { units: { include: { topics: true } } },
        orderBy: { code: "asc" },
      });

      if (courses.length > 0) {
        const list = courses
          .map((c) => {
            const topics = c.units.flatMap((u) => u.topics);
            const mastered = topics.filter((t) => t.status === "MASTERED").length;
            const pct = topics.length > 0 ? Math.round((mastered / topics.length) * 100) : 0;
            return `• **${c.code} (${c.name})**: ${mastered}/${topics.length} topics mastered (${pct}% readiness, Confidence: ${c.confidence}/5)`;
          })
          .join("\n");

        return {
          message: {
            role: "assistant",
            content: `Here are the active courses in your AMAHAS academic plan, ${userName}:\n\n${list}\n\nWould you like me to add another course or schedule an active recall revision session?`,
          },
        };
      } else {
        return {
          message: {
            role: "assistant",
            content: `You don't have any registered courses in your academic plan yet, ${userName}. Would you like me to add one for you right now? (For example: *"Add Antennas and Wave Propagation"*).`,
          },
        };
      }
    }

    // B. Task Management Fallback: Directly read tasks from Prisma
    if (intentResult.intent === "task_management" || lowerUserMsg.includes("task") || lowerUserMsg.includes("todo")) {
      const tasks = await prisma.task.findMany({
        where: { userId, status: "TODO" },
        take: 5,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
      const taskList =
        tasks.map((t) => `• [${t.priority}] **${t.title}**${t.estimatedMinutes ? ` (~${t.estimatedMinutes}m)` : ""}`).join("\n") ||
        "No pending tasks found.";

      return {
        message: {
          role: "assistant",
          content: `Here are your current high-priority tasks, ${userName}:\n\n${taskList}\n\nWould you like me to schedule a Deep Work focus block or add another task?`,
        },
      };
    }

    // C. Web Research Fallback: Execute search ONLY if intent was explicitly web research!
    if (intentResult.intent === "web_research") {
      try {
        const query = intentResult.extractedEntity?.query || lastUserMessage;
        const searchResult = await RESEARCH_TOOLS.search_web.execute(userId, { query, limit: 4 });
        if (searchResult.results && searchResult.results.length > 0) {
          const items = searchResult.results
            .map((r: any, idx: number) => `${idx + 1}. **[${r.title}](${r.url})**\n   ${r.snippet || "Click to view source"}`)
            .join("\n\n");
          return {
            message: {
              role: "assistant",
              content: `Here are the verified research results for **"${query}"**:\n\n${items}`,
            },
            executedToolResults: [{ toolName: "search_web", result: searchResult }],
          };
        }
      } catch (err: any) {
        console.warn("Web search fallback failed:", err.message);
      }
    }

    // D. Educational Conceptual Fallback (Direct Explanation — No Web Search!)
    if (
      lowerUserMsg.includes("antenna") ||
      lowerUserMsg.includes("wave") ||
      lowerUserMsg.includes("electromagnetic") ||
      lowerUserMsg.includes("superposition") ||
      lowerUserMsg.includes("paging") ||
      lowerUserMsg.includes("circuit") ||
      lowerUserMsg.includes("signal") ||
      lowerUserMsg.includes("explain")
    ) {
      return {
        message: {
          role: "assistant",
          content: `### Concept Overview: **${lastUserMessage.replace(/^(explain|what is|how does)\s+/gi, "").toUpperCase()}**

Electromagnetic radiation and transmission principles:
1. **Governing Principles**: Formulated by Maxwell's equations, where time-varying electric fields produce magnetic fields ($\nabla \times \vec{E} = -\frac{\partial \vec{B}}{\partial t}$) and vice-versa, propagating through free space at the speed of light $c$.
2. **Radiation Mechanism**: When alternating current accelerates through a conductor (such as a dipole or patch antenna), energy detaches from the near-field reactive zone into propagating plane waves in the far-field (Fraunhofer region).
3. **Core Parameters**:
   - Radiation Resistance ($R_r$) & Efficiency ($\eta$)
   - Directivity ($D$) and Power Gain ($G = \eta D$)
   - Beamwidth (HPBW) and Polarization (Linear, Circular, Elliptical)

Would you like me to break down a specific antenna geometry (e.g. half-wave dipole, microstrip patch) or derive the vector potential equations?`,
        },
      };
    }

    // E. General Friendly Conversational Fallback
    return {
      message: {
        role: "assistant",
        content: `I am here with you, ${userName}! We can organize your academic plan, schedule Deep Work focus blocks, manage tasks, or break down complex engineering concepts. What would you like to work on?`,
      },
    };
  }
}

export const aiGateway = new AIGateway();
