/**
 * AMAHAS Intent Classification & Routing Engine
 *
 * Deterministically routes user requests to the appropriate execution path
 * BEFORE any LLM tools are selected or invoked.
 *
 * Supported Intent Categories:
 * - general_chat: conversational, conceptual, educational answers (no tools needed)
 * - web_research: explicit live web search, paper discovery, online facts
 * - application_query: reading user's courses, tasks, schedule, progress
 * - application_action: creating, updating, or modifying application resources
 * - task_management: managing tasks and reminders
 * - knowledge_query: searching user's notes and internal documentation
 * - clarification_required: ambiguous requests needing user clarification (never web search)
 */

export type IntentType =
  | "general_chat"
  | "web_research"
  | "application_query"
  | "application_action"
  | "task_management"
  | "knowledge_query"
  | "clarification_required"
  | "application_navigation"
  | "unsupported_action";

export interface IntentRouteResult {
  intent: IntentType;
  confidence: number;
  targetDomain?: "academics" | "tasks" | "reminders" | "notes" | "schedule" | "dashboard" | "general" | string;
  clarificationMessage?: string;
  allowedToolNames: string[];
  extractedEntity?: {
    courseName?: string;
    courseCode?: string;
    taskTitle?: string;
    query?: string;
  };
  suggestedAction?: {
    toolName: string;
    suggestedArgs: any;
  };
  reason: string;
}

/**
 * Deterministic rules and heuristic pattern matching for high-confidence routing.
 */
export function classifyIntent(rawMessage: string): IntentRouteResult {
  // Strip trailing punctuation (. ! ?) for robust pattern matching
  const message = rawMessage.trim().replace(/[.!?]+$/, "").trim();
  const lower = message.toLowerCase();

  // 1. CLARIFICATION_REQUIRED — Ambiguous section editing or general modification requests
  // Examples: "Edit the Academics section", "Change academics", "Modify the dashboard section"
  const isVagueAcademicEdit =
    /^(edit|change|modify|update|customize|adjust|fix)\s+(the\s+)?(academics?|courses?|syllabus|curriculum)(\s+section|\s+page|\s+tab)?$/i.test(
      lower
    ) ||
    /^(how\s+to\s+)?(edit|change|modify|update)\s+(my\s+)?(academics?|courses?|syllabus)$/i.test(
      lower
    );

  if (isVagueAcademicEdit) {
    return {
      intent: "clarification_required",
      confidence: 0.95,
      targetDomain: "academics",
      clarificationMessage:
        "I'd be glad to help you modify the Academics section. What specific change would you like to make?\n\n" +
        "• **Add a new course**: Tell me the course name or code (e.g., *\"Add Antennas and Wave Propagation to my plan\"*)\n" +
        "• **Update an existing course**: Update your target grade, confidence, or semester\n" +
        "• **Record study revision**: Log an SM-2 spaced repetition rating for a topic\n" +
        "• **View active courses**: Review your registered subjects and syllabus mastery",
      allowedToolNames: [],
      reason: "Ambiguous request to edit Academics without specifying the target course or action.",
    };
  }

  const isVagueDashboardEdit =
    /^(edit|change|modify|update|customize)\s+(the\s+)?(dashboard|home|sections?)(\s+page|\s+tab)?$/i.test(
      lower
    );
  if (isVagueDashboardEdit) {
    return {
      intent: "clarification_required",
      confidence: 0.95,
      targetDomain: "dashboard",
      clarificationMessage:
        "I can help you customize your dashboard layout. What would you like to do?\n\n" +
        "• **Add a Resources section**: e.g., create a section with Video Links and Book folders\n" +
        "• **Reorganize widgets**: adjust study focus or task priorities\n" +
        "• **Customize workspace appearance**: adjust themes or layout modes",
      allowedToolNames: ["get_dashboard_sections", "customize_dashboard_section"],
      reason: "Ambiguous request to edit Dashboard without specifying the target section or layout.",
    };
  }

  // 1.5 APPLICATION_NAVIGATION — Instant workspace navigation
  // Examples: "Go to Academics", "Open Planner", "Navigate to Focus Arena", "Take me to tasks"
  const isNavigation =
    /^(go\s+to|open|navigate\s+to|take\s+me\s+to|switch\s+to|show\s+me)\s+(the\s+)?(academics|planner|focus|tasks|notes|research|graph|habits|goals|reminders|settings|automations|integrations|dashboard)(\s+page|\s+tab|\s+section)?$/i.test(
      lower
    );
  if (isNavigation) {
    const navMatch = lower.match(/(academics|planner|focus|tasks|notes|research|graph|habits|goals|reminders|settings|automations|integrations|dashboard)/i);
    const navTarget = navMatch ? navMatch[1].toLowerCase() : "dashboard";
    return {
      intent: "application_navigation",
      confidence: 0.98,
      targetDomain: (navTarget as any) || "general",
      allowedToolNames: [],
      clarificationMessage: `Navigating to /${navTarget}...`,
      reason: `Direct navigation request to ${navTarget}.`,
    };
  }

  // 2. Generic add course without parameter -> CLARIFICATION_REQUIRED
  // Examples: "Add a course to my plan", "Add a course", "Create a course", "Add a course to Academics."
  if (
    /^(add|create|register|enroll|put)\s+(a\s+)?(new\s+)?(course|subject|class)(\s+to\s+(my\s+)?(plan|courses?|schedule|academics?))?$/i.test(
      lower
    ) ||
    /^(add|put)\s+(a\s+)?course\s+in(to)?\s+academics?$/i.test(lower)
  ) {
    return {
      intent: "clarification_required",
      confidence: 0.95,
      targetDomain: "academics",
      clarificationMessage:
        "What is the title or course code of the subject you would like to add to Academics? (For example: *\"Add Antennas and Wave Propagation (EC402) to my academic plan\"*).",
      allowedToolNames: ["create_academic_record", "get_academic_records"],
      reason: "Request to add a course without specifying the course name or code.",
    };
  }

  // 3. APPLICATION_ACTION — Direct mutation of Academics with specific name
  // Examples: "Add Antennas and Wave Propagation to my academic plan", "Create course EC302"
  const addCourseMatch =
    message.match(
      /(?:add|create|register|enroll|put)\s+(?:course|subject|class)\s+['"]?([^'"]+?)['"]?(?:\s+to\s+(?:my\s+)?(?:academic\s+)?(?:plan|courses|schedule|academics))?$/i
    ) ||
    message.match(
      /(?:add|create|register)\s+['"]?([a-zA-Z0-9\s,&-]+?)['"]?\s+(?:as\s+(?:a\s+)?(?:course|subject)|to\s+(?:my\s+)?(?:academic\s+)?(?:plan|courses|schedule|academics))$/i
    ) ||
    message.match(/^add\s+([a-zA-Z0-9\s,&-]+?)\s+to\s+(?:my\s+)?(?:academic\s+plan|courses|academics)$/i);

  if (addCourseMatch) {
    const courseName = addCourseMatch[1].trim();
    // Verify it's not a placeholder
    const lowerName = courseName.toLowerCase();
    if (courseName && !["a course", "course", "subject", "a subject", "a class", "class", "academics"].includes(lowerName)) {
      return {
        intent: "application_action",
        confidence: 0.98,
        targetDomain: "academics",
        allowedToolNames: [
          "create_academic_record",
          "get_academic_records",
          "update_academic_record",
        ],
        extractedEntity: { courseName },
        suggestedAction: {
          toolName: "create_academic_record",
          suggestedArgs: { name: courseName },
        },
        reason: `Direct request to add academic course "${courseName}".`,
      };
    }
  }

  // Delete course action
  const deleteCourseMatch = message.match(
    /(?:delete|remove|drop)\s+(?:course|subject)\s+['"]?([a-zA-Z0-9\s,&-]+?)['"]?(?:\s+from\s+my\s+plan)?$/i
  );
  if (deleteCourseMatch) {
    return {
      intent: "application_action",
      confidence: 0.95,
      targetDomain: "academics",
      allowedToolNames: ["delete_academic_record", "get_academic_records"],
      extractedEntity: { courseName: deleteCourseMatch[1].trim() },
      reason: `Request to delete course "${deleteCourseMatch[1].trim()}".`,
    };
  }

  // 4. APPLICATION_QUERY — Reading Academics (Courses, Syllabus, Progress)
  // Examples: "What courses am I currently studying?", "Show my academic plan", "What is my syllabus progress?", "Show my current academic progress."
  const isAcademicQuery =
    /what\s+courses\s+(am\s+i|do\s+i|are\s+in)/i.test(lower) ||
    /list\s+(my\s+)?courses/i.test(lower) ||
    /(show|get|view)\s+(my\s+)?(academic\s+plan|courses|enrolled\s+subjects)/i.test(lower) ||
    /courses\s+(am\s+i\s+currently\s+studying|in\s+my\s+plan)/i.test(lower) ||
    /(how\s+many|what)\s+topics?\s+(have\s+i\s+mastered|are\s+mastered)/i.test(lower) ||
    /what\s+is\s+my\s+(syllabus|exam|revision)\s+(status|progress)/i.test(lower) ||
    /(show|get|view|what\s+is)\s+(my\s+)?(current\s+)?academic\s+(progress|status|readiness|standing)/i.test(lower) ||
    /my\s+academic\s+progress/i.test(lower);

  if (isAcademicQuery) {
    return {
      intent: "application_query",
      confidence: 0.96,
      targetDomain: "academics",
      allowedToolNames: ["get_academic_records", "get_course_progress"],
      reason: "User inquiring about their existing academic records, courses, or syllabus progress.",
    };
  }

  // 4.5 ACADEMIC_PLANNING — Spaced repetition and revision planning
  // Examples: "Plan my revision for tomorrow", "Plan tomorrow's revision", "Schedule revision for my exams"
  const isRevisionPlanning =
    /(?:plan|schedule|organize|set\s+up)\s+(?:my\s+)?(?:revision|study\s+plan|spaced\s+repetition)/i.test(lower) ||
    /plan\s+tomorrow'?s\s+(?:revision|study)/i.test(lower);

  if (isRevisionPlanning) {
    return {
      intent: "application_action",
      confidence: 0.96,
      targetDomain: "academics",
      allowedToolNames: [
        "get_academic_records",
        "get_schedule",
        "create_reminder",
        "schedule_focus_block",
        "create_task",
      ],
      reason: "Request to plan and organize academic revision workflow.",
    };
  }

  // 5. TASK_MANAGEMENT — Tasks, Todos, Reminders
  // Examples: "What tasks do I have today?", "Create a task to finish lab", "Create a task for my research project and remind me before its deadline"
  const isReminderCreation =
    /(?:remind\s+me|create\s+(?:a\s+)?reminder|set\s+(?:a\s+)?reminder|add\s+(?:a\s+)?reminder)/i.test(
      lower
    );
  const isTaskCreation =
    /(?:add|create|schedule|make)\s+(?:a\s+)?(?:new\s+)?(?:revision\s+|study\s+|prep\s+)?(?:task|todo|homework|assignment)/i.test(lower) ||
    /(?:create|add|schedule)\s+(?:a\s+)?revision\s+task/i.test(lower);
  const isTaskQuery =
    /(?:what\s+tasks|list\s+(?:my\s+)?tasks|show\s+(?:my\s+)?tasks|my\s+pending\s+tasks|high\s+priority\s+tasks|what\s+are\s+my\s+todos)/i.test(
      lower
    );
  const isTaskUpdate =
    /(?:mark\s+task|complete\s+task|finish\s+task|update\s+task\s+status|move\s+.*task\s+to|reschedule\s+.*task|postpone\s+.*task)/i.test(lower);

  // Combined Task + Reminder Creation (Workflow B)
  if (isTaskCreation && isReminderCreation) {
    return {
      intent: "task_management",
      confidence: 0.98,
      targetDomain: "tasks",
      allowedToolNames: ["create_task", "create_reminder", "get_projects", "get_tasks", "get_schedule"],
      reason: "Multi-step request to create a task and set a linked reminder.",
    };
  }

  if (isReminderCreation) {
    return {
      intent: "task_management",
      confidence: 0.95,
      targetDomain: "reminders",
      allowedToolNames: ["create_reminder", "get_tasks", "get_schedule"],
      reason: "Request to create an alarm or deadline reminder.",
    };
  }

  if (isTaskCreation || isTaskUpdate) {
    // Extract task title for creation if present
    let taskTitle: string | undefined;
    const taskMatch = message.match(/(?:task|todo)\s+(?:to|for|called)?\s+['"]?([^'"]+?)['"]?$/i);
    if (taskMatch) {
      taskTitle = taskMatch[1].trim();
    } else if (/revision\s+task/i.test(lower)) {
      const revMatch = message.match(/(?:for|on|about)\s+['"]?([^'"]+?)['"]?$/i);
      taskTitle = revMatch ? `Revision for ${revMatch[1].trim()}` : "Academic Revision Task";
    }

    return {
      intent: "task_management",
      confidence: 0.95,
      targetDomain: "tasks",
      allowedToolNames: ["create_task", "update_task", "update_task_status", "get_tasks", "create_reminder", "get_projects"],
      extractedEntity: taskTitle ? { taskTitle } : undefined,
      suggestedAction: isTaskCreation && taskTitle ? {
        toolName: "create_task",
        suggestedArgs: { title: taskTitle, priority: "HIGH" },
      } : undefined,
      reason: isTaskUpdate ? "Request to update or reschedule student tasks." : "Request to create student task.",
    };
  }

  if (isTaskQuery) {
    return {
      intent: "task_management",
      confidence: 0.95,
      targetDomain: "tasks",
      allowedToolNames: ["get_tasks", "get_schedule"],
      reason: "Request to inspect existing tasks and schedule.",
    };
  }

  // 5.5 NOTE_CAPTURE — Saving ideas, findings, or notes into knowledge graph (Workflow C)
  // Examples: "Save this idea in my research notes and connect it to the relevant project", "Take a note about...", "Save note"
  const isNoteCapture =
    /(?:save|write|record|put|store|capture|take)\s+(?:this\s+)?(?:idea|note|thought|finding|summary)?\s*(?:in(?:to)?\s+(?:my\s+)?(?:research\s+)?notes?)/i.test(
      lower
    ) ||
    /(?:save|create|add)\s+(?:a\s+)?(?:new\s+)?note/i.test(lower) ||
    /take\s+(?:a\s+)?note/i.test(lower);

  if (isNoteCapture) {
    return {
      intent: "application_action",
      confidence: 0.95,
      targetDomain: "notes",
      allowedToolNames: ["create_note", "get_projects", "search_notes"],
      reason: "Request to create or save a note/idea into the workspace.",
    };
  }

  // 6. KNOWLEDGE_QUERY — Notes, Docs, Knowledge Graph
  // Examples: "Search my notes for Nyquist", "Find my notes on Operating Systems", "Show my research notes."
  if (
    /(search|find|show|lookup|get|view|list)\s+(my\s+)?(research\s+)?notes/i.test(lower) ||
    /notes\s+(on|about|for)/i.test(lower) ||
    /(show|get|view|list)\s+(my\s+)?research\s+(records|notes|papers)/i.test(lower)
  ) {
    return {
      intent: "knowledge_query",
      confidence: 0.95,
      targetDomain: "notes",
      allowedToolNames: ["search_notes", "get_academic_records"],
      reason: "Request to query user's internal notes and knowledge graph.",
    };
  }

  // 7. WEB_RESEARCH — Explicit internet search, papers, external syllabus lookup
  // Examples: "Find the latest GATE syllabus", "Search the web for...", "Search arXiv papers on..."
  const isExplicitWebSearch =
    /^(search\s+(the\s+)?(web|internet)|google|look\s+up\s+online)\s+for/i.test(lower) ||
    /(?:search\s+web|web\s+search)\s*:/i.test(lower) ||
    /find\s+the\s+latest\s+([a-zA-Z0-9\s]+?)\s+(syllabus|notification|paper|news|updates?)/i.test(
      lower
    ) ||
    /search\s+(?:arxiv|openalex|research\s+papers?)\s+(?:for|on)/i.test(lower);

  if (isExplicitWebSearch) {
    let q = message
      .replace(/^(search\s+(the\s+)?(web|internet)\s+for|google|look\s+up\s+online\s+for|find\s+the\s+latest)\s+/gi, "")
      .trim();
    if (!q) q = message;

    return {
      intent: "web_research",
      confidence: 0.94,
      targetDomain: "general",
      allowedToolNames: ["search_web", "fetch_webpage_content", "search_research_papers"],
      extractedEntity: { query: q },
      reason: "Explicit user instruction to perform external web research or search latest papers.",
    };
  }

  // 8. GENERAL_CHAT — Educational, conceptual explanations, math, science, greetings
  // Examples: "Explain electromagnetic wave propagation", "Explain antennas", "What is superposition theorem?"
  const isEducationalConcept =
    /^(explain|breakdown|clarify|derive|what\s+is|how\s+does|tell\s+me\s+about)\s+(the\s+)?(concept\s+of\s+)?([a-zA-Z0-9\s,&-]+?)$/i.test(
      lower
    );

  const isGreeting =
    /^(hi|hello|hey|yo|greetings|good\s+morning|good\s+afternoon|good\s+evening)(\s+there|\s+amahas|\s+assistant)?[!.]*$/i.test(
      lower
    );

  if (isGreeting || isEducationalConcept) {
    return {
      intent: "general_chat",
      confidence: 0.92,
      targetDomain: "general",
      allowedToolNames: [], // No tools needed for pure explanations and greetings!
      reason: isGreeting
        ? "Conversational greeting."
        : "Educational conceptual explanation question — direct answer required without invoking external tools.",
    };
  }

  // Default to general_chat for conversational interaction rather than calling web search!
  return {
    intent: "general_chat",
    confidence: 0.7,
    targetDomain: "general",
    allowedToolNames: [],
    reason: "Standard conversational inquiry without explicit tool trigger.",
  };
}
