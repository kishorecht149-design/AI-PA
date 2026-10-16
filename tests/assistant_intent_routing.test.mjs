import test from "node:test";
import assert from "node:assert/strict";
import { classifyIntent } from "../src/lib/intent-router.ts";
import {
  APPLICATION_TOOLS,
  RESEARCH_TOOLS,
  ALL_TOOLS,
  getToolsForIntent,
  validateToolArgs,
} from "../src/lib/tools-registry.ts";
import { decodeHtmlEntities, sanitizeUrl } from "../src/lib/format-utils.ts";
import { prisma } from "../src/lib/prisma.ts";

// Scenario 1: "Edit the Academics section." must not trigger unrelated web search
test("Scenario 1: 'Edit the Academics section.' routes to clarification_required and never web search", () => {
  const result = classifyIntent("Edit the Academics section.");
  assert.equal(result.intent, "clarification_required");
  assert.equal(result.targetDomain, "academics");
  assert.ok(result.clarificationMessage, "Must provide structured clarification options");
  assert.ok(!result.allowedToolNames.includes("search_web"), "Must NOT allow search_web");

  const tools = getToolsForIntent(result.intent);
  assert.equal(Object.keys(tools).length, 0, "No tools passed for clarification_required");
});

// Scenario 2: "What courses are in my academic plan?" must use application data when available
test("Scenario 2: 'What courses are in my academic plan?' routes to application_query", () => {
  const result = classifyIntent("What courses are in my academic plan?");
  assert.equal(result.intent, "application_query");
  assert.equal(result.targetDomain, "academics");
  assert.ok(result.allowedToolNames.includes("get_academic_records"));

  const tools = getToolsForIntent(result.intent);
  assert.ok(tools["get_academic_records"], "get_academic_records must be available");
  assert.ok(!tools["search_web"], "search_web must be excluded from application_query");
  assert.ok(!tools["create_academic_record"], "Mutating tools must be excluded from application_query");
});

// Scenario 3: "Add a course to my plan." must request missing required fields or perform a validated mutation
test("Scenario 3: Course creation validation and parameter enforcement", () => {
  // A. Vague addition without name routes to clarification_required
  const vague = classifyIntent("Add a course to my plan.");
  assert.equal(vague.intent, "clarification_required");
  assert.ok(vague.clarificationMessage?.includes("title or course code"));

  // B. Specific addition routes to application_action with extracted entity
  const specific = classifyIntent("Add Antennas and Wave Propagation to my academic plan.");
  assert.equal(specific.intent, "application_action");
  assert.equal(specific.targetDomain, "academics");
  assert.ok(specific.allowedToolNames.includes("create_academic_record"));
  assert.equal(specific.suggestedAction?.toolName, "create_academic_record");
  assert.equal(specific.suggestedAction?.suggestedArgs?.name, "Antennas and Wave Propagation");

  // C. Server-side validation requires course name
  const createTool = APPLICATION_TOOLS["create_academic_record"];
  const invalidValidation = validateToolArgs(createTool, { instructor: "Prof. Smith" });
  assert.equal(invalidValidation.valid, false);
  assert.ok(invalidValidation.errors.some((e) => e.includes("name")));

  const validValidation = validateToolArgs(createTool, { name: "Digital Signal Processing", code: "EC305" });
  assert.equal(validValidation.valid, true);
});

// Scenario 4: "Find the latest GATE syllabus." must use web research
test("Scenario 4: 'Find the latest GATE syllabus.' routes to web_research", () => {
  const result = classifyIntent("Find the latest GATE syllabus.");
  assert.equal(result.intent, "web_research");
  assert.ok(result.allowedToolNames.includes("search_web"));

  const tools = getToolsForIntent(result.intent);
  assert.ok(tools["search_web"], "search_web must be available for web_research");
  assert.ok(!tools["create_academic_record"], "Application mutation tools must be excluded from web_research");
  assert.ok(!tools["create_task"], "Task mutation tools must be excluded from web_research");
});

// Scenario 5: "Explain antennas." must produce a direct educational answer without web search or mutating tools
test("Scenario 5: 'Explain antennas.' routes to general_chat without tool invocation", () => {
  const result = classifyIntent("Explain antennas.");
  assert.equal(result.intent, "general_chat");
  assert.equal(result.allowedToolNames.length, 0);

  const tools = getToolsForIntent(result.intent);
  assert.equal(Object.keys(tools).length, 0, "No tools should be invoked for pure conceptual tutoring");
});

// Scenario 6: A database failure must not produce a false success message
test("Scenario 6: Failures throw errors and never return false success flags", async () => {
  const originalUpdate = prisma.course?.update;
  const originalFindFirst = prisma.course?.findFirst;

  try {
    if (prisma.course) {
      prisma.course.findFirst = async () => ({ id: "c1", userId: "user1", name: "DSP", code: "EC305" });
      prisma.course.update = async () => {
        throw new Error("Database disk I/O error");
      };
    }
    const updateTool = APPLICATION_TOOLS["update_academic_record"];
    await assert.rejects(
      async () => {
        await updateTool.execute("user1", { courseId: "c1", name: "New Name" });
      },
      /Database disk I\/O error/,
      "Database failure must throw real error, not return false success"
    );
  } finally {
    if (prisma.course) {
      prisma.course.update = originalUpdate;
      prisma.course.findFirst = originalFindFirst;
    }
  }
});

// Scenario 7: A user must not access or mutate another user's academic records
test("Scenario 7: Cross-user query scoping ensures strict tenancy boundaries", async () => {
  const originalFindFirst = prisma.course?.findFirst;

  try {
    if (prisma.course) {
      // Return null when searching for victim's course under attacker's userId
      prisma.course.findFirst = async ({ where }) => {
        if (where.userId === "user_attacker_001") return null;
        return { id: "c1", userId: "victim_user" };
      };
    }
    const updateTool = APPLICATION_TOOLS["update_academic_record"];
    await assert.rejects(
      async () => {
        await updateTool.execute("user_attacker_001", {
          courseId: "c1",
          name: "Hacked Course",
        });
      },
      /Course not found/,
      "Attacker cannot mutate victim records"
    );
  } finally {
    if (prisma.course) {
      prisma.course.findFirst = originalFindFirst;
    }
  }
});

// Scenario 8: Destructive actions must follow the application's confirmation policy
test("Scenario 8: Destructive tools are explicitly flagged with isDestructive: true", () => {
  assert.equal(APPLICATION_TOOLS["delete_academic_record"].isReadOnly, false);
  assert.equal(APPLICATION_TOOLS["delete_academic_record"].isDestructive, true);

  assert.equal(APPLICATION_TOOLS["delete_task"].isReadOnly, false);
  assert.equal(APPLICATION_TOOLS["delete_task"].isDestructive, true);

  // Non-destructive mutations execute safely
  assert.equal(APPLICATION_TOOLS["create_academic_record"].isDestructive, false);
  assert.equal(APPLICATION_TOOLS["create_task"].isDestructive, false);
  assert.equal(APPLICATION_TOOLS["create_reminder"].isDestructive, false);
});

// Scenario 9: Markdown and HTML entities must render correctly
test("Scenario 9: HTML entities and Markdown characters decode safely", () => {
  // Test &#039;, &#39;, &amp;, &quot;, &lt;, &gt;, &nbsp;
  const rawWithEntities = "It&#039;s a great day &amp; you&#39;re studying &quot;Electromagnetics&quot; &lt;Wave&gt;";
  const decoded = decodeHtmlEntities(rawWithEntities);

  assert.equal(decoded, 'It\'s a great day & you\'re studying "Electromagnetics" <Wave>');
  assert.ok(!decoded.includes("&#039;"), "Must decode &#039; to apostrophe");
  assert.ok(!decoded.includes("&#39;"), "Must decode &#39; to apostrophe");
  assert.ok(!decoded.includes("&amp;"), "Must decode &amp; to ampersand");
  assert.ok(!decoded.includes("&quot;"), "Must decode &quot; to quotation mark");

  // Test hex entities
  assert.equal(decodeHtmlEntities("&#x27;Hello&#x27;"), "'Hello'");

  // Test URL sanitizer
  assert.equal(sanitizeUrl("https://example.com/syllabus"), "https://example.com/syllabus");
  assert.equal(sanitizeUrl("javascript:alert(1)"), "#", "Must block javascript: URLs");
  assert.equal(sanitizeUrl("data:text/html,<script>"), "#", "Must block data: URLs");
});

// Scenario 10: A failed web search must not corrupt the conversation or trigger unrelated fallback search
test("Scenario 10: General inquiries never default to web search", () => {
  const result = classifyIntent("How should I organize my week?");
  assert.equal(result.intent, "general_chat");
  assert.equal(result.allowedToolNames.length, 0);

  const tools = getToolsForIntent(result.intent);
  assert.ok(!tools["search_web"], "search_web must never be invoked for general planning advice");
});

// Scenario 11: An application action must remain distinguishable from a research request
test("Scenario 11: Application action vs Research request distinction", () => {
  const actionResult = classifyIntent("Add EC301 Discrete Mathematics to my courses");
  const researchResult = classifyIntent("Search the web for Discrete Mathematics tutorials");

  assert.equal(actionResult.intent, "application_action");
  assert.equal(researchResult.intent, "web_research");

  const actionTools = getToolsForIntent(actionResult.intent);
  const researchTools = getToolsForIntent(researchResult.intent);

  assert.ok(actionTools["create_academic_record"], "Action has create_academic_record");
  assert.ok(!actionTools["search_web"], "Action has NO search_web");

  assert.ok(researchTools["search_web"], "Research has search_web");
  assert.ok(!researchTools["create_academic_record"], "Research has NO create_academic_record");
});

// Scenario 12: Existing application tools are all registered and typed
test("Scenario 12: All required application tools exist and satisfy parameter contracts", () => {
  const expectedTools = [
    "get_academic_records",
    "get_academic_courses",
    "create_academic_record",
    "update_academic_record",
    "delete_academic_record",
    "get_tasks",
    "create_task",
    "update_task",
    "delete_task",
    "create_reminder",
    "get_schedule",
    "search_notes",
    "customize_dashboard_section",
    "search_web",
  ];

  for (const name of expectedTools) {
    const tool = ALL_TOOLS[name];
    assert.ok(tool, `Tool '${name}' must be registered in ALL_TOOLS`);
    assert.ok(tool.name, `Tool '${name}' must have a name`);
    assert.ok(tool.description, `Tool '${name}' must have a description`);
    assert.equal(typeof tool.execute, "function", `Tool '${name}' execute must be a function`);
  }
});
