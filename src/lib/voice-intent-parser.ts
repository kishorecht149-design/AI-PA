/**
 * Voice Intent Parser for AMAHAS Omni-Command Voice AI
 * Analyzes natural spoken voice commands and extracts actionable structured intents:
 * - Task Creation
 * - Deep Work Arena session launches
 * - Reminder / Alarm scheduling
 * - Quick Note creation
 * - Workspace Navigation
 * - AI Knowledge Queries
 */

export type VoiceIntentType =
  | "CREATE_TASK"
  | "START_FOCUS"
  | "SET_REMINDER"
  | "TAKE_NOTE"
  | "NAVIGATE"
  | "QUERY_AI";

export interface ParsedVoiceIntent {
  type: VoiceIntentType;
  confidence: number;
  rawText: string;
  summary: string;
  payload: any;
}

export function parseVoiceIntent(rawText: string): ParsedVoiceIntent {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. NAVIGATION INTENTS
  if (
    lower.startsWith("go to ") ||
    lower.startsWith("open ") ||
    lower.startsWith("show ") ||
    lower.startsWith("navigate to ")
  ) {
    if (lower.includes("graph") || lower.includes("mind map") || lower.includes("concept")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to 3D Knowledge Graph",
        payload: { path: "/graph", name: "Knowledge Graph" },
      };
    }
    if (lower.includes("focus") || lower.includes("arena") || lower.includes("deep work")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Deep Work Arena",
        payload: { path: "/focus", name: "Deep Work Arena" },
      };
    }
    if (lower.includes("research") || lower.includes("paper") || lower.includes("lab")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Research Lab",
        payload: { path: "/research", name: "Research Lab" },
      };
    }
    if (lower.includes("academics") || lower.includes("course") || lower.includes("study")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Academics & SM-2 Studio",
        payload: { path: "/academics", name: "Academics" },
      };
    }
    if (lower.includes("task") || lower.includes("todo") || lower.includes("board")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Tasks Matrix",
        payload: { path: "/tasks", name: "Tasks" },
      };
    }
    if (lower.includes("plan") || lower.includes("calendar") || lower.includes("schedule")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Planner",
        payload: { path: "/planner", name: "Planner" },
      };
    }
    if (lower.includes("note") || lower.includes("document")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Notes",
        payload: { path: "/notes", name: "Notes" },
      };
    }
    if (lower.includes("dashboard") || lower.includes("home") || lower.includes("portal")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Dashboard",
        payload: { path: "/dashboard", name: "Dashboard" },
      };
    }
    if (lower.includes("reminder") || lower.includes("alarm")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Reminders & Alarms",
        payload: { path: "/reminders", name: "Reminders" },
      };
    }
    if (lower.includes("learning") || lower.includes("studio")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Learning Studio",
        payload: { path: "/learning", name: "Learning Studio" },
      };
    }
    if (lower.includes("setting") || lower.includes("profile")) {
      return {
        type: "NAVIGATE",
        confidence: 0.95,
        rawText: text,
        summary: "Navigating to Settings",
        payload: { path: "/settings", name: "Settings" },
      };
    }
  }

  // 2. FOCUS / DEEP WORK ARENA INTENTS
  if (
    (lower.includes("start") && (lower.includes("focus") || lower.includes("flow") || lower.includes("pomodoro") || lower.includes("deep work"))) ||
    lower.includes("enter flow") ||
    lower.includes("play gamma") ||
    lower.includes("play brown noise") ||
    lower.includes("focus session")
  ) {
    const minMatch = lower.match(/(\d+)\s*(min|minute)?/);
    let minutes = minMatch ? parseInt(minMatch[1], 10) : 45;
    if (lower.includes("fifteen")) minutes = 15;
    else if (lower.includes("twenty-five") || lower.includes("pomodoro")) minutes = 25;
    else if (lower.includes("hour")) minutes = 60;
    else if (lower.includes("ninety")) minutes = 90;

    let presetId = "gamma-40";
    if (lower.includes("beta")) presetId = "beta-14";
    else if (lower.includes("alpha")) presetId = "alpha-10";
    else if (lower.includes("theta")) presetId = "theta-6";
    else if (lower.includes("brown") || lower.includes("noise")) presetId = "brown-noise";
    else if (lower.includes("rain")) presetId = "rain";

    return {
      type: "START_FOCUS",
      confidence: 0.92,
      rawText: text,
      summary: `Engaging ${minutes}-minute Flow State with ${presetId}`,
      payload: { minutes, presetId },
    };
  }

  // 3. TASK CREATION INTENT
  if (
    lower.startsWith("add task ") ||
    lower.startsWith("create task ") ||
    lower.startsWith("new task ") ||
    lower.startsWith("add a task ") ||
    lower.startsWith("create a task ") ||
    lower.startsWith("remind me to ")
  ) {
    // Strip command prefixes
    let clean = text
      .replace(/^(add|create|new)\s+(a\s+)?task\s+(to\s+)?/i, "")
      .replace(/^remind me to\s+/i, "")
      .trim();

    let priority = "MEDIUM";
    if (lower.includes("urgent") || lower.includes("high priority") || lower.includes("p1")) {
      priority = "HIGH";
      clean = clean.replace(/\b(urgent|high priority|p1)\b/gi, "").trim();
    } else if (lower.includes("low priority") || lower.includes("p3")) {
      priority = "LOW";
      clean = clean.replace(/\b(low priority|p3)\b/gi, "").trim();
    }

    const title = clean.charAt(0).toUpperCase() + clean.slice(1);

    return {
      type: "CREATE_TASK",
      confidence: 0.9,
      rawText: text,
      summary: `Creating ${priority} priority task: "${title}"`,
      payload: {
        title: title || "New Voice Task",
        priority,
      },
    };
  }

  // 4. NOTE TAKING INTENT
  if (
    lower.startsWith("take note:") ||
    lower.startsWith("take a note:") ||
    lower.startsWith("take note ") ||
    lower.startsWith("save note ") ||
    lower.startsWith("note down ")
  ) {
    let clean = text
      .replace(/^(take|save|write)\s+(a\s+)?note(\s*:|\s+down)?\s*/i, "")
      .trim();

    const title = clean.length > 30 ? clean.slice(0, 28) + "..." : clean;
    return {
      type: "TAKE_NOTE",
      confidence: 0.88,
      rawText: text,
      summary: `Saving note: "${title}"`,
      payload: {
        title: title || "Voice Note",
        content: clean,
        category: "GENERAL",
      },
    };
  }

  // 5. REMINDER / ALARM SCHEDULING INTENT
  if (
    lower.startsWith("set reminder ") ||
    lower.startsWith("set a reminder ") ||
    lower.startsWith("set alarm ") ||
    lower.startsWith("set an alarm ")
  ) {
    let clean = text
      .replace(/^set\s+(a\s+)?(reminder|alarm)\s+(for|at|to)?\s*/i, "")
      .trim();

    // Look for time pattern e.g. "at 9:00" or "for 5:30"
    const timeMatch = clean.match(/(\d{1,2}(:\d{2})?\s*(am|pm)?)/i);
    const timeStr = timeMatch ? timeMatch[0] : "12:00";
    const title = clean.replace(timeStr, "").replace(/\b(at|for)\b/gi, "").trim() || "Voice Reminder";

    return {
      type: "SET_REMINDER",
      confidence: 0.85,
      rawText: text,
      summary: `Scheduling reminder "${title}" at ${timeStr}`,
      payload: {
        title,
        time: timeStr,
      },
    };
  }

  // 6. DEFAULT: GENERAL ASSISTANT / AI QUERY
  return {
    type: "QUERY_AI",
    confidence: 0.95,
    rawText: text,
    summary: `Asking AMAHAS AI: "${text.length > 40 ? text.slice(0, 38) + "..." : text}"`,
    payload: {
      question: text,
    },
  };
}
