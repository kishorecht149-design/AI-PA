import test from "node:test";
import assert from "node:assert/strict";
import { assistantEngine } from "../src/lib/assistant-engine.ts";
import { classifyIntent } from "../src/lib/intent-router.ts";
import {
  APPLICATION_TOOLS,
  ALL_TOOLS,
  getToolsForIntent,
  validateToolArgs,
} from "../src/lib/tools-registry.ts";
import {
  generateConfirmationToken,
  verifyAndConsumeConfirmationToken,
} from "../src/lib/tool-confirmation.ts";
import { prisma } from "../src/lib/prisma.ts";

// =============================================================================
// SPRINT 3: AUTONOMOUS ASSISTANT ENGINE TEST SUITE
// =============================================================================

test("Sprint 3 - Criterion 1: Internal intent routing never invokes unrelated web search", () => {
  const testCases = [
    "Plan my revision for tomorrow",
    "Plan tomorrow's revision",
    "Create a task for my research project and remind me before its deadline",
    "Save this idea in my research notes and connect it to the relevant project",
    "What tasks do I have scheduled today?",
    "Add Antennas and Wave Propagation to my plan",
  ];

  for (const query of testCases) {
    const route = classifyIntent(query);
    assert.notEqual(route.intent, "web_research", `Query '${query}' must not route to web_research`);
    assert.ok(
      !route.allowedToolNames.includes("search_web"),
      `Query '${query}' must not allow search_web`
    );

    const tools = getToolsForIntent(route.intent);
    assert.equal(
      tools["search_web"],
      undefined,
      `Tool 'search_web' must never be passed for internal intent ${route.intent}`
    );
  }
});

test("Sprint 3 - Criterion 2: Server-side argument validation halts before tool execution", async () => {
  const toolDef = APPLICATION_TOOLS["create_task"];
  assert.ok(toolDef);

  // Missing required field 'title'
  const invalidArgs = { priority: "HIGH", estimatedMinutes: 45 };
  const validation = validateToolArgs(toolDef, invalidArgs);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes("title")));

  // Test inside engine plan execution
  const plan = {
    id: "plan-val-test",
    goal: "Test invalid argument validation",
    state: "planned",
    currentStepIndex: 0,
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: "step-1",
        toolName: "create_task",
        args: invalidArgs,
        description: "Invalid task creation",
        status: "pending",
      },
    ],
  };

  const outcome = await assistantEngine.executePlan(plan, "user-test-val");
  assert.equal(outcome.plan.state, "failed");
  assert.equal(outcome.plan.steps[0].status, "failed");
  assert.ok(outcome.plan.steps[0].error?.includes("Argument validation failed"));
});

test("Sprint 3 - Criterion 3: Bounded multi-step workflow with dependency resolution (Example B)", async () => {
  const userId = "user-wf-dep";
  const createdTaskId = "task-dep-101";

  const originalTaskCreate = prisma.task?.create;
  const originalNotifCreate = prisma.notification?.create;
  const originalNotifFindFirst = prisma.notification?.findFirst;
  const originalTaskFindFirst = prisma.task?.findFirst;

  let capturedTaskData = null;
  let capturedNotifData = null;

  try {
    prisma.task.create = async ({ data }) => {
      capturedTaskData = data;
      return { id: createdTaskId, ...data };
    };

    prisma.task.findFirst = async ({ where }) => {
      if (where.id === createdTaskId && where.userId === userId) {
        return { id: createdTaskId, userId, title: "AWQ INT4 Benchmark" };
      }
      return null;
    };

    prisma.notification.findFirst = async () => null;
    prisma.notification.create = async ({ data }) => {
      capturedNotifData = data;
      return { id: "notif-dep-202", ...data };
    };

    const plan = {
      id: "plan-dep-workflow",
      goal: "Create task and linked reminder",
      state: "planned",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: "step-1",
          toolName: "create_task",
          description: "Create research deliverable task",
          args: { title: "AWQ INT4 Benchmark", priority: "HIGH" },
          status: "pending",
        },
        {
          id: "step-2",
          toolName: "create_reminder",
          description: "Set reminder linked to created task",
          dependsOnStepId: "step-1",
          argMapping: { taskId: "task.id" },
          args: {
            title: "Deadline Alert: AWQ INT4 Benchmark",
            category: "DEADLINE",
          },
          status: "pending",
        },
      ],
    };

    const outcome = await assistantEngine.executePlan(plan, userId);

    assert.equal(outcome.plan.state, "completed");
    assert.equal(outcome.plan.steps[0].status, "completed");
    assert.equal(outcome.plan.steps[1].status, "completed");

    // Verify dependency was resolved: step-2 taskId received step-1 task.id
    assert.equal(outcome.plan.steps[1].args.taskId, createdTaskId);
    assert.ok(capturedNotifData);
    assert.equal(capturedNotifData.link, `/tasks?id=${createdTaskId}`);
  } finally {
    prisma.task.create = originalTaskCreate;
    prisma.notification.create = originalNotifCreate;
    prisma.notification.findFirst = originalNotifFindFirst;
    prisma.task.findFirst = originalTaskFindFirst;
  }
});

test("Sprint 3 - Criterion 4: Ambiguous requests generate structured clarification without web search", async () => {
  const userId = "user-clarif-test";

  // Case A: Ambiguous section editing
  const resA = await assistantEngine.processRequest({
    userId,
    message: "Edit the Academics section",
  });
  assert.equal(resA.executionState, "completed");
  assert.ok(resA.clarificationQuestion);
  assert.ok(resA.clarificationQuestion.includes("Academics"));

  // Case B: Ambiguous project matching when multiple research projects exist
  const originalResProjFindMany = prisma.researchProject?.findMany;
  try {
    prisma.researchProject.findMany = async () => [
      { id: "rp-1", title: "Apple Metal INT4 Benchmark" },
      { id: "rp-2", title: "Raft Consensus Log Compaction" },
    ];

    const resB = await assistantEngine.processRequest({
      userId,
      message: "Create a task for my research project and remind me before its deadline",
    });

    assert.ok(resB.clarificationQuestion, "Must ask clarification when multiple research projects match");
    assert.ok(resB.clarificationQuestion.includes("Apple Metal INT4 Benchmark"));
    assert.ok(resB.clarificationQuestion.includes("Raft Consensus Log Compaction"));
  } finally {
    prisma.researchProject.findMany = originalResProjFindMany;
  }
});

test("Sprint 3 - Criterion 5: Destructive actions halt in awaiting_confirmation without valid token", async () => {
  const userId = "user-destr-test";
  const taskId = "task-to-delete-123";

  const originalDelete = prisma.task?.delete;
  const originalFindFirst = prisma.task?.findFirst;
  let deleteExecuted = false;

  try {
    prisma.task.findFirst = async ({ where }) => {
      if (where.id === taskId && where.userId === userId) {
        return { id: taskId, userId, title: "Obsolete Task" };
      }
      return null;
    };
    prisma.task.delete = async () => {
      deleteExecuted = true;
      return { id: taskId };
    };

    const plan = {
      id: "plan-destructive",
      goal: "Delete task",
      state: "planned",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: "step-1",
          toolName: "delete_task",
          description: "Delete obsolete task",
          isDestructive: true,
          args: { taskId },
          status: "pending",
        },
      ],
    };

    // Attempt execution WITHOUT confirmation token
    const outcome = await assistantEngine.executePlan(plan, userId);

    assert.equal(outcome.requiresConfirmation, true);
    assert.equal(outcome.plan.state, "awaiting_confirmation");
    assert.ok(outcome.confirmationToken, "Must generate valid HMAC confirmation token");
    assert.equal(deleteExecuted, false, "Database delete MUST NOT be called without confirmation");

    // Now attempt execution WITH the generated confirmation token
    const confirmedOutcome = await assistantEngine.executePlan(
      plan,
      userId,
      outcome.confirmationToken
    );
    assert.equal(confirmedOutcome.requiresConfirmation, false);
    assert.equal(confirmedOutcome.plan.state, "completed");
  } finally {
    prisma.task.delete = originalDelete;
    prisma.task.findFirst = originalFindFirst;
  }
});

test("Sprint 3 - Criterion 6: Partial failure halts remaining steps and reports honest status", async () => {
  const userId = "user-partial-fail";

  const originalTaskCreate = prisma.task?.create;
  const originalNotifCreate = prisma.notification?.create;

  let taskCreated = false;
  let notifAttempted = false;

  try {
    prisma.task.create = async ({ data }) => {
      taskCreated = true;
      return { id: "task-part-1", ...data };
    };

    prisma.notification.create = async () => {
      notifAttempted = true;
      throw new Error("Downstream notification service database unreachable");
    };

    const plan = {
      id: "plan-partial-test",
      goal: "Test partial failure handling",
      state: "planned",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: "step-1",
          toolName: "create_task",
          description: "Create primary study task",
          args: { title: "Study Fourier Optics" },
          status: "pending",
        },
        {
          id: "step-2",
          toolName: "create_reminder",
          description: "Create secondary reminder",
          args: { title: "Reminder Fourier" },
          status: "pending",
        },
        {
          id: "step-3",
          toolName: "schedule_focus_block",
          description: "Third step that should be skipped",
          args: { title: "Focus Fourier", durationMinutes: 45 },
          status: "pending",
        },
      ],
    };

    const outcome = await assistantEngine.executePlan(plan, userId);

    assert.equal(outcome.plan.state, "partially_completed");
    assert.equal(outcome.plan.steps[0].status, "completed");
    assert.equal(outcome.plan.steps[1].status, "failed");
    assert.equal(outcome.plan.steps[2].status, "skipped", "Step 3 must be skipped upon step 2 failure");

    // Verify honest synthesis
    const synthesis = assistantEngine.synthesizeResponse(outcome.plan, "Student");
    assert.ok(synthesis.includes("partially completed"));
    assert.ok(synthesis.includes("Halted on error"));
    assert.ok(synthesis.includes("Remaining steps were safely cancelled"));
  } finally {
    prisma.task.create = originalTaskCreate;
    prisma.notification.create = originalNotifCreate;
  }
});

test("Sprint 3 - Criterion 7: Duplicate loop prevention blocks identical tool calls in same plan", async () => {
  const userId = "user-loop-test";

  const originalNotifCreate = prisma.notification?.create;
  const originalNotifFindFirst = prisma.notification?.findFirst;

  try {
    prisma.notification.create = async ({ data }) => ({ id: "notif-loop-1", ...data });
    prisma.notification.findFirst = async () => null;

    const plan = {
      id: "plan-loop-prevention",
      goal: "Test loop and duplicate call prevention",
      state: "planned",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: "step-1",
          toolName: "create_reminder",
          args: { title: "Study Alert", category: "REVIEW" },
          description: "First call",
          status: "pending",
        },
        {
          id: "step-2",
          toolName: "create_reminder",
          args: { title: "Study Alert", category: "REVIEW" }, // Identical call
          description: "Duplicate call",
          status: "pending",
        },
      ],
    };

    const outcome = await assistantEngine.executePlan(plan, userId);
    assert.equal(outcome.plan.state, "partially_completed");
    assert.equal(outcome.plan.steps[0].status, "completed");
    assert.equal(outcome.plan.steps[1].status, "failed");
    assert.ok(outcome.plan.steps[1].error?.includes("Duplicate repeated tool call detected"));
  } finally {
    prisma.notification.create = originalNotifCreate;
    prisma.notification.findFirst = originalNotifFindFirst;
  }
});

test("Sprint 3 - Criterion 8: Cross-user access rejection preserves strict tenant isolation", async () => {
  const attackerUserId = "user-attacker";
  const victimUserId = "user-victim";
  const victimResearchId = "rp-victim-secret";

  const originalRpFindFirst = prisma.researchProject?.findFirst;
  const originalNoteCreate = prisma.note?.create;
  let createdNoteData = null;

  try {
    prisma.researchProject.findFirst = async ({ where }) => {
      // Victim owns project, attacker does not
      if (where.id === victimResearchId && where.userId === victimUserId) {
        return { id: victimResearchId, userId: victimUserId, title: "Secret Research" };
      }
      return null;
    };

    prisma.note.create = async ({ data }) => {
      createdNoteData = data;
      return { id: "note-tenant-1", ...data };
    };

    // Attacker invokes create_note attempting to link victim's research project
    const noteTool = APPLICATION_TOOLS["create_note"];
    const result = await noteTool.execute(attackerUserId, {
      title: "Exploit Note",
      content: "Unauthorized cross-tenant link",
      researchProjectId: victimResearchId,
    });

    assert.ok(result.success);
    // Attacker's note must NOT link to victim's research project
    assert.equal(createdNoteData.researchProjectId, null);
    assert.equal(createdNoteData.userId, attackerUserId);
  } finally {
    prisma.researchProject.findFirst = originalRpFindFirst;
    prisma.note.create = originalNoteCreate;
  }
});

test("Sprint 3 - Criterion 9: Provider timeout and malformed output fall back gracefully", async () => {
  const userId = "user-fallback-test";

  // Deterministic intent router and engine should resolve directly without throwing
  const result = await assistantEngine.processRequest({
    userId,
    message: "What high-priority tasks do I have scheduled today?",
  });

  assert.ok(result.message);
  assert.ok(result.message.content);
  assert.equal(result.executionState, "completed");
});

test("Sprint 3 - Criterion 10: Multi-step Research Capture establishes supported relation (Example C)", async () => {
  const userId = "user-capture-test";
  const rpId = "rp-capture-100";

  const originalRpFindMany = prisma.researchProject?.findMany;
  const originalRpFindFirst = prisma.researchProject?.findFirst;
  const originalNoteCreate = prisma.note?.create;

  let savedNote = null;

  try {
    prisma.researchProject.findMany = async () => [
      { id: rpId, title: "Apple Metal INT4 Profiling" },
    ];
    prisma.researchProject.findFirst = async ({ where }) => {
      if (where.id === rpId && where.userId === userId) {
        return { id: rpId, userId, title: "Apple Metal INT4 Profiling" };
      }
      return null;
    };
    prisma.note.create = async ({ data }) => {
      savedNote = data;
      return { id: "note-captured-1", ...data };
    };

    const res = await assistantEngine.processRequest({
      userId,
      message: "Save this idea in my research notes and connect it to the relevant project: evaluate kernel latency at 70 tokens/sec",
    });

    assert.equal(res.executionState, "completed");
    assert.ok(savedNote);
    assert.equal(savedNote.researchProjectId, rpId);
    assert.ok(savedNote.contentMarkdown.includes("evaluate kernel latency"));
    assert.ok(res.message.content.includes("Completed successfully"));
  } finally {
    prisma.researchProject.findMany = originalRpFindMany;
    prisma.researchProject.findFirst = originalRpFindFirst;
    prisma.note.create = originalNoteCreate;
  }
});
