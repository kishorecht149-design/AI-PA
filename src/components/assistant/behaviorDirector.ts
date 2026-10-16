import type { AssistantState } from "./types.ts";

export interface BehaviorCommand {
  behavior: AssistantState;
  intensity: number; // Clamped to [0.0, 1.0]
  durationMs: number; // Clamped to [500, 8000]
  reason?: string;
}

export const ALLOWED_AUTONOMOUS_BEHAVIORS: AssistantState[] = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "speaking",
  "acknowledging",
  "explaining",
  "success",
  "warning",
  "goodbye",
];

/**
 * Validates, sanitizes, and clamps incoming behavior commands.
 * "dance" is strictly forbidden unless allowExplicitDance is true.
 */
export function validateBehaviorCommand(
  raw: any,
  allowExplicitDance = false
): BehaviorCommand {
  if (!raw || typeof raw !== "object") {
    return {
      behavior: "idle",
      intensity: 0.5,
      durationMs: 2500,
      reason: "Fallback due to invalid command payload",
    };
  }

  const rawBehavior = String(raw.behavior || "").toLowerCase().trim();

  // Guard: Never allow accidental dancing
  if (rawBehavior === "dance" && !allowExplicitDance) {
    return {
      behavior: "success",
      intensity: 0.8,
      durationMs: 3000,
      reason: "Dance clamped to task success acknowledgment",
    };
  }

  let resolvedBehavior: AssistantState = "idle";
  if (ALLOWED_AUTONOMOUS_BEHAVIORS.includes(rawBehavior as AssistantState)) {
    resolvedBehavior = rawBehavior as AssistantState;
  } else if (rawBehavior === "dance" && allowExplicitDance) {
    resolvedBehavior = "dance";
  } else if (rawBehavior === "celebration") {
    resolvedBehavior = "success";
  } else if (rawBehavior === "alert" || rawBehavior === "caution") {
    resolvedBehavior = "warning";
  } else if (rawBehavior === "farewell" || rawBehavior === "bye") {
    resolvedBehavior = "goodbye";
  } else if (rawBehavior === "tutorial" || rawBehavior === "teach") {
    resolvedBehavior = "explaining";
  } else {
    resolvedBehavior = "idle";
  }

  const intensityVal = typeof raw.intensity === "number" ? raw.intensity : 0.75;
  const clampedIntensity = Math.max(0.0, Math.min(1.0, intensityVal));

  const durationVal = typeof raw.durationMs === "number" ? raw.durationMs : 3000;
  const clampedDuration = Math.max(500, Math.min(8000, durationVal));

  return {
    behavior: resolvedBehavior,
    intensity: clampedIntensity,
    durationMs: clampedDuration,
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
  };
}

/**
 * Infers or extracts structured behavior command from assistant content and user prompt.
 */
export function inferBehaviorFromContent(
  assistantText: string,
  userPrompt: string,
  executedTools?: any[]
): { cleanedText: string; command: BehaviorCommand } {
  let cleanedText = assistantText || "";
  let extractedCommand: any = null;

  // 1. Check for embedded <behavior>...</behavior> tag in LLM response
  const tagMatch = cleanedText.match(/<behavior>([\s\S]*?)<\/behavior>/i);
  if (tagMatch) {
    try {
      extractedCommand = JSON.parse(tagMatch[1].trim());
    } catch {}
    cleanedText = cleanedText.replace(/<behavior>[\s\S]*?<\/behavior>/gi, "").trim();
  }

  const userLower = (userPrompt || "").toLowerCase();
  const isExplicitDance = /\b(dance for me|do a dance|show me a dance|please dance|breakdance)\b/i.test(userLower);

  if (extractedCommand) {
    return {
      cleanedText,
      command: validateBehaviorCommand(extractedCommand, isExplicitDance),
    };
  }

  // 2. Check explicit dance request
  if (isExplicitDance) {
    return {
      cleanedText,
      command: {
        behavior: "dance",
        intensity: 1.0,
        durationMs: 4500,
        reason: "User explicitly requested a dance flourish",
      },
    };
  }

  // 3. Check for task completion / tool execution success
  const hasExecutedTools = Array.isArray(executedTools) && executedTools.length > 0;
  const lowerResp = cleanedText.toLowerCase();

  if (
    hasExecutedTools ||
    /\b(completed|all set|done|fixed|success|finished successfully|great job|accomplished|created task|updated)\b/i.test(lowerResp)
  ) {
    return {
      cleanedText,
      command: {
        behavior: "success",
        intensity: 0.85,
        durationMs: 3200,
        reason: "Task completed successfully",
      },
    };
  }

  // 4. Check for greeting
  if (/\b(hi|hello|hey|greetings|welcome|good morning|good afternoon)\b/i.test(userLower) && lowerResp.length < 200) {
    return {
      cleanedText,
      command: {
        behavior: "greeting",
        intensity: 0.8,
        durationMs: 2800,
        reason: "Friendly greeting",
      },
    };
  }

  // 5. Check for farewell / goodbye
  if (/\b(goodbye|bye|see you|farewell|good night)\b/i.test(userLower) || /\b(goodbye|have a great day|see you next time)\b/i.test(lowerResp)) {
    return {
      cleanedText,
      command: {
        behavior: "goodbye",
        intensity: 0.8,
        durationMs: 2800,
        reason: "Farewell / session end",
      },
    };
  }

  // 6. Check for technical tutorial / explanatory breakdown
  if (
    cleanedText.includes("```") ||
    /\b(here is how|for example|step 1|architecture|diagram|let's explain|in summary)\b/i.test(lowerResp)
  ) {
    return {
      cleanedText,
      command: {
        behavior: "explaining",
        intensity: 0.85,
        durationMs: 3800,
        reason: "Technical explanation / tutorial",
      },
    };
  }

  // 7. Default conversational reply
  return {
    cleanedText,
    command: {
      behavior: "speaking",
      intensity: 0.75,
      durationMs: 3200,
      reason: "Conversational answer",
    },
  };
}
