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
  | "clarification_required";

export interface IntentRouteResult {
  intent: IntentType;
  confidence: number;
  targetDomain?: "academics" | "tasks" | "reminders" | "notes" | "schedule" | "dashboard" | "general";
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

  // 2. Generic add course without parameter -> CLARIFICATION_REQUIRED
  // Examples: "Add a course to my plan", "Add a course", "Create a course"
  if (
    /^(add|create|register|enroll|put)\s+(a\s+)?(new\s+)?(course|subject|class)(\s+to\s+my\s+(plan|courses|schedule))?$/i.test(
      lower
    )
  ) {
    return {
      intent: "clarification_required",
      confidence: 0.95,
      targetDomain: "academics",
      clarificationMessage:
        "What is the title or course code of the subject you would like to add? (For example: *\"Add Antennas and Wave Propagation (EC402) to my academic plan\"*).",
      allowedToolNames: ["create_academic_record", "get_academic_records"],
      reason: "Request to add a course without specifying the course name or code.",
    };
  }

  // 3. APPLICATION_ACTION — Direct mutation of Academics with specific name
  // Examples: "Add Antennas and Wave Propagation to my academic plan", "Create course EC302"
  const addCourseMatch =
    message.match(
      /(?:add|create|register|enroll|put)\s+(?:course|subject|class)\s+['"]?([^'"]+?)['"]?(?:\s+to\s+my\s+(?:academic\s+)?(?:plan|courses|schedule))?$/i
    ) ||
    message.match(
      /(?:add|create|register)\s+['"]?([a-zA-Z0-9\s,&-]+?)['"]?\s+(?:as\s+(?:a\s+)?(?:course|subject)|to\s+my\s+(?:academic\s+)?(?:plan|courses|schedule))$/i
    ) ||
    message.match(/^add\s+([a-zA-Z0-9\s,&-]+?)\s+to\s+(?:my\s+)?(?:academic\s+plan|courses)$/i);

  if (addCourseMatch) {
    const courseName = addCourseMatch[1].trim();
    // Verify it's not a placeholder
    const lowerName = courseName.toLowerCase();
    if (courseName && !["a course", "course", "subject", "a subject", "a class", "class"].includes(lowerName)) {
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
  // Examples: "What courses am I currently studying?", "Show my academic plan", "What is my syllabus progress?"
  const isAcademicQuery =
    /what\s+courses\s+(am\s+i|do\s+i|are\s+in)/i.test(lower) ||
    /list\s+(my\s+)?courses/i.test(lower) ||
    /(show|get|view)\s+(my\s+)?(academic\s+plan|courses|enrolled\s+subjects)/i.test(lower) ||
    /courses\s+(am\s+i\s+currently\s+studying|in\s+my\s+plan)/i.test(lower) ||
    /(how\s+many|what)\s+topics?\s+(have\s+i\s+mastered|are\s+mastered)/i.test(lower) ||
    /what\s+is\s+my\s+(syllabus|exam|revision)\s+(status|progress)/i.test(lower);

  if (isAcademicQuery) {
    return {
      intent: "application_query",
      confidence: 0.96,
      targetDomain: "academics",
      allowedToolNames: ["get_academic_records", "get_course_progress"],
      reason: "User inquiring about their existing academic records, courses, or syllabus progress.",
    };
  }

  // 5. TASK_MANAGEMENT — Tasks, Todos, Reminders
  // Examples: "What tasks do I have today?", "Create a task to finish lab", "Add reminder for exam"
  const isReminderCreation =
    /(?:remind\s+me|create\s+(?:a\s+)?reminder|set\s+(?:a\s+)?reminder|add\s+(?:a\s+)?reminder)/i.test(
      lower
    );
  const isTaskCreation =
    /(?:add|create|schedule|make)\s+(?:a\s+)?(?:new\s+)?(?:task|todo|homework)/i.test(lower);
  const isTaskQuery =
    /(?:what\s+tasks|list\s+(?:my\s+)?tasks|show\s+(?:my\s+)?tasks|my\s+pending\s+tasks|high\s+priority\s+tasks|what\s+are\s+my\s+todos)/i.test(
      lower
    );
  const isTaskUpdate =
    /(?:mark\s+task|complete\s+task|finish\s+task|update\s+task\s+status)/i.test(lower);

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
    return {
      intent: "task_management",
      confidence: 0.95,
      targetDomain: "tasks",
      allowedToolNames: ["create_task", "update_task", "update_task_status", "get_tasks", "create_reminder"],
      reason: "Request to mutate student tasks.",
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

  // 6. KNOWLEDGE_QUERY — Notes, Docs, Knowledge Graph
  // Examples: "Search my notes for Nyquist", "Find my notes on Operating Systems"
  if (
    /(search|find|show|lookup)\s+(my\s+)?notes/i.test(lower) ||
    /notes\s+(on|about|for)/i.test(lower)
  ) {
    return {
      intent: "knowledge_query",
      confidence: 0.92,
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
