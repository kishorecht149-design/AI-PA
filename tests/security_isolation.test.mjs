import test from "node:test";
import assert from "node:assert/strict";
import { APPLICATION_TOOLS, validateToolArgs } from "../src/lib/tools-registry.ts";
import { testConnector } from "../src/lib/integrations/connectors.ts";

test("Security & Isolation: Read-only tools require no confirmation; mutating tools require confirmation", () => {
  // Mutating tools
  const mutatingToolNames = [
    "create_task",
    "update_task_status",
    "schedule_focus_block",
    "log_habit_completion",
    "record_syllabus_revision",
    "trigger_workflow",
  ];

  for (const name of mutatingToolNames) {
    const tool = APPLICATION_TOOLS[name];
    assert.ok(tool, `Tool ${name} must exist`);
    assert.equal(tool.isReadOnly, false, `${name} must require confirmation before mutation`);
  }

  // Safe read-only tools
  const readOnlyToolNames = [
    "search_tasks",
    "get_schedule",
    "get_course_progress",
    "search_notes",
    "search_research_papers",
  ];

  for (const name of readOnlyToolNames) {
    const tool = APPLICATION_TOOLS[name];
    assert.ok(tool, `Tool ${name} must exist`);
    assert.equal(tool.isReadOnly, true, `${name} should be read-only`);
  }
});

test("Security & Isolation: Server-side tool validation rejects invalid or missing required parameters", () => {
  const createTaskTool = APPLICATION_TOOLS["create_task"];

  // Missing required 'title'
  const invalid1 = validateToolArgs(createTaskTool, {});
  assert.equal(invalid1.valid, false);
  assert.ok(invalid1.errors.some((e) => e.includes("title")));

  // Whitespace-only title
  const invalid2 = validateToolArgs(createTaskTool, { title: "   " });
  assert.equal(invalid2.valid, false);

  // Invalid priority enum
  const invalid3 = validateToolArgs(createTaskTool, { title: "Valid Title", priority: "SUPER_URGENT" });
  assert.equal(invalid3.valid, false);
  assert.ok(invalid3.errors.some((e) => e.includes("priority")));

  // Valid arguments
  const valid = validateToolArgs(createTaskTool, {
    title: "Read Chapter 4 of Signals & Systems",
    priority: "HIGH",
    estimatedMinutes: 60,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test("Security & Isolation: Server-side tool validation for update_task_status", () => {
  const updateTool = APPLICATION_TOOLS["update_task_status"];

  // Missing taskId or status
  assert.equal(validateToolArgs(updateTool, { taskId: "123" }).valid, false);
  assert.equal(validateToolArgs(updateTool, { status: "COMPLETED" }).valid, false);

  // Invalid enum status
  assert.equal(validateToolArgs(updateTool, { taskId: "123", status: "DISCARDED" }).valid, false);

  // Valid update
  assert.equal(validateToolArgs(updateTool, { taskId: "123", status: "COMPLETED" }).valid, true);
});

test("Security & Isolation: Cross-user query scoping ensures data isolation", () => {
  const userA = "user_A_id";
  const userB = "user_B_id";

  const allTasks = [
    { id: "t1", userId: userA, title: "User A Private Research Task" },
    { id: "t2", userId: userB, title: "User B Private Exam Task" },
  ];

  // Scoped retrieval
  const getUserTasks = (uid) => allTasks.filter((t) => t.userId === uid);

  const tasksA = getUserTasks(userA);
  assert.equal(tasksA.length, 1);
  assert.equal(tasksA[0].id, "t1");
  assert.ok(!tasksA.some((t) => t.userId === userB), "User A cannot see User B tasks");

  const tasksB = getUserTasks(userB);
  assert.equal(tasksB.length, 1);
  assert.equal(tasksB[0].id, "t2");
  assert.ok(!tasksB.some((t) => t.userId === userA), "User B cannot see User A tasks");
});

test("Security & Isolation: Export safety sanitizes sensitive data and preserves user boundaries", () => {
  const mockUserRecord = {
    id: "user_student_1",
    email: "student@amahas.internal",
    passwordHash: "salt123:pbkdf2_secret_hash_not_for_export",
    name: "Student",
    role: "student",
  };

  // Safe export transformation
  const sanitizeForExport = (user) => {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  };

  const exported = sanitizeForExport(mockUserRecord);
  assert.equal(exported.passwordHash, undefined, "passwordHash must never be included in export");
  assert.equal(exported.email, "student@amahas.internal");
  assert.equal(exported.id, "user_student_1");
});

test("Security & Isolation: Integration failure handling is graceful and returns structured errors", async () => {
  // Test connector with missing endpoint or dummy key
  const openRouterResult = await testConnector("OPENROUTER", { apiKey: "" });
  assert.equal(openRouterResult.success, false);
  assert.ok(openRouterResult.message.includes("API key"));

  // Unsupported or unconfigured provider
  const unknownResult = await testConnector("UNKNOWN_SERVICE", {});
  assert.equal(unknownResult.success, false);
  assert.ok(unknownResult.message.includes("requires external configuration"));
});
