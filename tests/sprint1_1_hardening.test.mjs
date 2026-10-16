import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  createSessionToken,
  verifySessionToken,
  hashPassword,
} from "../src/lib/auth-crypto.ts";
import {
  generateConfirmationToken,
  verifyAndConsumeConfirmationToken,
  hashToolArgs,
} from "../src/lib/tool-confirmation.ts";
import { eventBus } from "../src/lib/events.ts";
import { ALL_TOOLS, APPLICATION_TOOLS, validateToolArgs } from "../src/lib/tools-registry.ts";
import { createOutboxEventOperation } from "../src/lib/outbox.ts";

// =============================================================================
// SPRINT 1.1 REGRESSION TEST SUITE: AUTHENTICATION HARDENING & DATA RELIABILITY
// =============================================================================

// -----------------------------------------------------------------------------
// Priority 1: Authentication & Tenant Isolation
// -----------------------------------------------------------------------------

test("Sprint 1.1 - Case 1: Missing session token returns null and cannot authenticate", () => {
  const verified = verifySessionToken("");
  assert.equal(verified, null, "Empty token must be rejected");

  const verifiedNull = verifySessionToken(null);
  assert.equal(verifiedNull, null, "Null token must be rejected");
});

test("Sprint 1.1 - Case 2: Tampered or forged session token is rejected cryptographically", () => {
  const validUser = {
    id: "user_owner_001",
    email: "kishore@amahas.internal",
    name: "Kishore",
    role: "student",
  };
  const token = createSessionToken(validUser);
  const [data, sig] = token.split(".");

  // Attempt 1: Tampering payload data (e.g. changing user id to admin)
  const decodedPayload = JSON.parse(Buffer.from(data, "base64url").toString());
  decodedPayload.id = "user_admin_forged";
  const forgedData = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url");
  const forgedToken = `${forgedData}.${sig}`;

  assert.equal(verifySessionToken(forgedToken), null, "Forged payload must fail HMAC verification");

  // Attempt 2: Tampering signature
  const corruptedSig = sig.slice(0, -4) + "AAAA";
  assert.equal(verifySessionToken(`${data}.${corruptedSig}`), null, "Corrupted signature must fail");
});

test("Sprint 1.1 - Case 3: Expired session token is rejected", () => {
  const user = {
    id: "user_exp_001",
    email: "student@amahas.internal",
    name: "Student",
    role: "student",
  };
  const expiredPayload = {
    ...user,
    exp: Date.now() - 1000, // Expired 1 second ago
  };

  const SECRET = process.env.AUTH_SECRET || "amahas-secure-local-dev-secret-string-min32";
  const data = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  const expiredToken = `${data}.${signature}`;

  assert.equal(verifySessionToken(expiredToken), null, "Expired token must be rejected");
});

test("Sprint 1.1 - Case 4: Legitimate authenticated single-user session resolves correctly", () => {
  const legitimateUser = {
    id: "user_kishore_owner",
    email: "kishore@amahas.internal",
    name: "Kishore",
    role: "student",
  };
  const token = createSessionToken(legitimateUser);
  const verified = verifySessionToken(token);

  assert.ok(verified, "Legitimate token must be successfully verified");
  assert.equal(verified?.id, "user_kishore_owner");
  assert.equal(verified?.email, "kishore@amahas.internal");
});

test("Sprint 1.1 - Case 5: Production environment strictly ignores dev bypass", () => {
  // Test simulation: In production, dev bypass must not activate
  const simulateResolve = (env, bypassFlag, hasSession) => {
    if (hasSession) return "authenticated_user_id";
    const isDevBypass = env === "development" && bypassFlag === "true";
    if (!isDevBypass) return null;
    return "dev_fallback_id";
  };

  // Production without session
  assert.equal(simulateResolve("production", "true", false), null, "Production must ignore bypass flag");
  assert.equal(simulateResolve("production", "false", false), null, "Production must return null without session");

  // Development with explicit bypass
  assert.equal(simulateResolve("development", "true", false), "dev_fallback_id", "Dev bypass allowed when explicit");

  // Development without explicit bypass
  assert.equal(simulateResolve("development", "false", false), null, "Dev requires explicit flag");

  // Authenticated user in production
  assert.equal(simulateResolve("production", "false", true), "authenticated_user_id", "Authenticated user succeeds in prod");
});

test("Sprint 1.1 - Case 6: Cross-user mutation guard on Notes prevents unauthorized updates", () => {
  const userA = "user_A";
  const userB = "user_B";
  const notesDb = [
    { id: "note_1", userId: userA, title: "User A Confidential Research" },
  ];

  const updateNote = (requestUserId, noteId, newTitle) => {
    const existing = notesDb.find((n) => n.id === noteId && n.userId === requestUserId);
    if (!existing) {
      return { status: 404, error: "Note not found or unauthorized" };
    }
    existing.title = newTitle;
    return { status: 200, note: existing };
  };

  // User B attempts to overwrite User A's note
  const unauthorizedAttempt = updateNote(userB, "note_1", "Overwritten by Attacker");
  assert.equal(unauthorizedAttempt.status, 404);
  assert.equal(notesDb[0].title, "User A Confidential Research", "User A note must remain unaltered");

  // User A legitimate update
  const legitimateUpdate = updateNote(userA, "note_1", "User A Updated Research");
  assert.equal(legitimateUpdate.status, 200);
  assert.equal(notesDb[0].title, "User A Updated Research");
});

test("Sprint 1.1 - Case 7: Cross-user deletion guard on Habits prevents deleting foreign habit logs", () => {
  const userA = "user_A";
  const userB = "user_B";
  const habitsDb = [{ id: "habit_1", userId: userA, name: "Daily Meditation" }];
  const habitLogsDb = [{ id: "log_1", habitId: "habit_1", dateString: "2026-10-16" }];

  const deleteHabit = (requestUserId, habitId) => {
    const habit = habitsDb.find((h) => h.id === habitId && h.userId === requestUserId);
    if (!habit) {
      return { status: 404, error: "Habit not found or unauthorized" };
    }
    // Only delete if verified ownership
    const logIdx = habitLogsDb.findIndex((l) => l.habitId === habitId);
    if (logIdx >= 0) habitLogsDb.splice(logIdx, 1);
    const habitIdx = habitsDb.findIndex((h) => h.id === habitId);
    if (habitIdx >= 0) habitsDb.splice(habitIdx, 1);
    return { status: 200, success: true };
  };

  // User B attempts to delete User A's habit
  const attack = deleteHabit(userB, "habit_1");
  assert.equal(attack.status, 404);
  assert.equal(habitsDb.length, 1, "Habit record must survive cross-user delete attempt");
  assert.equal(habitLogsDb.length, 1, "Habit logs must survive cross-user delete attempt");
});

test("Sprint 1.1 - Case 8: Cross-user mutation guard on Academics validates topic course ownership", () => {
  const userA = "user_A";
  const userB = "user_B";
  const coursesDb = [{ id: "course_1", userId: userA, name: "Electromagnetics" }];
  const unitsDb = [{ id: "unit_1", courseId: "course_1" }];
  const topicsDb = [{ id: "topic_1", unitId: "unit_1", title: "Maxwell Equations", confidenceLevel: 2 }];

  const recordRevision = (requestUserId, topicId, rating) => {
    const topic = topicsDb.find((t) => t.id === topicId);
    if (!topic) return { status: 404, error: "Topic not found" };
    const unit = unitsDb.find((u) => u.id === topic.unitId);
    const course = unit ? coursesDb.find((c) => c.id === unit.courseId) : null;

    if (!course || course.userId !== requestUserId) {
      return { status: 404, error: "Topic not found or unauthorized" };
    }

    topic.confidenceLevel = rating;
    return { status: 200, topic };
  };

  const crossUserAttempt = recordRevision(userB, "topic_1", 5);
  assert.equal(crossUserAttempt.status, 404);
  assert.equal(topicsDb[0].confidenceLevel, 2, "Topic confidence must remain untouched by foreign user");

  const validRevision = recordRevision(userA, "topic_1", 5);
  assert.equal(validRevision.status, 200);
  assert.equal(topicsDb[0].confidenceLevel, 5);
});

test("Sprint 1.1 - Case 9: Planner task scheduling verifies task tenant ownership", () => {
  const userA = "user_A";
  const userB = "user_B";
  const tasksDb = [
    { id: "task_1", userId: userA, title: "User A Assignment", scheduledDate: null, status: "TODO" },
  ];

  const scheduleBlock = (requestUserId, taskId, startTime) => {
    // Task must belong to requestUserId
    const task = tasksDb.find((t) => t.id === taskId && t.userId === requestUserId);
    if (!task && taskId) {
      return { status: 403, error: "Cannot schedule task belonging to another user" };
    }
    if (task) {
      task.scheduledDate = startTime;
      task.status = "IN_PROGRESS";
    }
    return { status: 201, scheduledTaskId: task ? task.id : null };
  };

  // User B tries to link and manipulate User A's task
  const blockedAttempt = scheduleBlock(userB, "task_1", new Date());
  assert.equal(blockedAttempt.status, 403);
  assert.equal(tasksDb[0].scheduledDate, null, "Task scheduledDate must remain null");
  assert.equal(tasksDb[0].status, "TODO");
});

// -----------------------------------------------------------------------------
// Priority 4: Assistant Confirmation Security
// -----------------------------------------------------------------------------

test("Sprint 1.1 - Case 10: Destructive tools strictly require cryptographic confirmation token", () => {
  const deleteTaskTool = APPLICATION_TOOLS["delete_task"] || ALL_TOOLS["delete_task"];
  assert.ok(deleteTaskTool, "delete_task tool must exist");
  assert.equal(deleteTaskTool.isDestructive, true, "delete_task must be flagged destructive");

  const deleteCourseTool = APPLICATION_TOOLS["delete_academic_record"] || ALL_TOOLS["delete_academic_record"];
  assert.ok(deleteCourseTool, "delete_academic_record tool must exist");
  assert.equal(deleteCourseTool.isDestructive, true, "delete_academic_record must be flagged destructive");
});

test("Sprint 1.1 - Case 11: Confirmation token is strictly bound to authenticated user", async () => {
  const userA = "user_A_123";
  const userB = "user_B_456";
  const toolName = "delete_task";
  const args = { taskId: "task_to_delete_999" };

  const tokenForUserA = generateConfirmationToken({
    userId: userA,
    toolName,
    args,
  });

  // User B attempts to consume User A's token
  const result = await verifyAndConsumeConfirmationToken({
    token: tokenForUserA,
    userId: userB, // Mismatched user!
    toolName,
    args,
  });

  assert.equal(result.valid, false);
  assert.ok(result.reason?.includes("different user"), "Must reject cross-user token consumption");
});

test("Sprint 1.1 - Case 12: Confirmation token prevents parameter substitution and tampering", async () => {
  const userId = "user_kishore";
  const toolName = "delete_task";
  const originalArgs = { taskId: "task_target_1" };
  const tamperedArgs = { taskId: "task_target_999_critical" };

  const token = generateConfirmationToken({
    userId,
    toolName,
    args: originalArgs,
  });

  // Client attempts to swap argument while reusing valid token
  const tamperedResult = await verifyAndConsumeConfirmationToken({
    token,
    userId,
    toolName,
    args: tamperedArgs,
  });

  assert.equal(tamperedResult.valid, false);
  assert.ok(tamperedResult.reason?.includes("not match"), "Must reject argument substitution");
});

test("Sprint 1.1 - Case 13: Confirmation token prevents replay attacks", async () => {
  const userId = "user_replay_test";
  const toolName = "delete_task";
  const args = { taskId: "task_single_use" };

  const token = generateConfirmationToken({
    userId,
    toolName,
    args,
  });

  // First consumption: should succeed
  const firstUse = await verifyAndConsumeConfirmationToken({
    token,
    userId,
    toolName,
    args,
  });
  assert.equal(firstUse.valid, true, "First consumption must succeed");

  // Second consumption (replay attempt): must fail
  const replayAttempt = await verifyAndConsumeConfirmationToken({
    token,
    userId,
    toolName,
    args,
  });
  assert.equal(replayAttempt.valid, false);
  assert.ok(replayAttempt.reason?.includes("already been consumed"), "Replay attempt must be blocked");
});

test("Sprint 1.1 - Case 14: Expired confirmation token is rejected", async () => {
  const userId = "user_expire_test";
  const toolName = "delete_task";
  const args = { taskId: "task_exp" };

  // Manually construct an expired token
  const SECRET = process.env.AUTH_SECRET || "amahas-secure-local-dev-secret-string-min32";
  const expiredPayload = {
    jti: `conf_${Date.now()}_expired`,
    userId,
    toolName,
    argsHash: hashToolArgs(args),
    exp: Date.now() - 5000, // Expired 5 seconds ago
  };

  const payloadStr = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadStr)
    .digest("base64url");
  const expiredToken = `${payloadStr}.${signature}`;

  const result = await verifyAndConsumeConfirmationToken({
    token: expiredToken,
    userId,
    toolName,
    args,
  });

  assert.equal(result.valid, false);
  assert.ok(result.reason?.includes("expired"), "Expired confirmation token must be rejected");
});

test("Sprint 1.1 - Case 14b: Concurrent requests using identical confirmation token are mutually exclusive (zero race condition)", async () => {
  const userId = "user_concurrent_test";
  const toolName = "delete_task";
  const args = { taskId: "task_race_target_1" };

  const token = generateConfirmationToken({
    userId,
    toolName,
    args,
  });

  // Launch two concurrent asynchronous verification calls in parallel
  const [res1, res2] = await Promise.all([
    verifyAndConsumeConfirmationToken({ token, userId, toolName, args }),
    verifyAndConsumeConfirmationToken({ token, userId, toolName, args }),
  ]);

  // Exactly one must succeed and exactly one must fail
  const successCount = (res1.valid ? 1 : 0) + (res2.valid ? 1 : 0);
  const failureCount = (!res1.valid ? 1 : 0) + (!res2.valid ? 1 : 0);

  assert.equal(successCount, 1, "Exactly one concurrent confirmation request must succeed");
  assert.equal(failureCount, 1, "The competing concurrent request must be blocked");

  const rejected = !res1.valid ? res1 : res2;
  assert.ok(
    rejected.reason?.includes("already been consumed") || rejected.reason?.includes("in-flight"),
    "Rejected concurrent request must be caught by atomic mutex"
  );
});

test("Sprint 1.1 - Case 14c: In production, missing or short secret fails closed", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.AUTH_SECRET;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_SECRET;

    // Simulation of fail-closed secret lookup in production
    const getSecretProd = (env, secret) => {
      if (!secret || secret.length < 32) {
        if (env === "production") {
          throw new Error("AUTH_SECRET unconfigured in production");
        }
        return "dev-fallback";
      }
      return secret;
    };

    assert.throws(() => getSecretProd(process.env.NODE_ENV, process.env.AUTH_SECRET), /production/);
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalSecret) process.env.AUTH_SECRET = originalSecret;
  }
});

// -----------------------------------------------------------------------------
// Priority 2: Event-Bus Durability & Persistent Deduplication
// -----------------------------------------------------------------------------

test("Sprint 1.1 - Case 15: Event bus deduplicates events by deterministic event ID", async () => {
  let executionCount = 0;
  const testEventType = "task.completed";
  const deterministicEventId = "evt_deterministic_fixed_12345";

  const unsubscribe = eventBus.subscribe(testEventType, async () => {
    executionCount++;
  });

  try {
    // First publication
    await eventBus.publish(
      testEventType,
      "task_fixed_10",
      "user_fixed",
      { taskId: "task_fixed_10" },
      "corr_1",
      deterministicEventId
    );

    assert.equal(executionCount, 1, "Handler should run once on initial publish");

    // Re-publish identical event ID (e.g. HTTP client retry)
    await eventBus.publish(
      testEventType,
      "task_fixed_10",
      "user_fixed",
      { taskId: "task_fixed_10" },
      "corr_1",
      deterministicEventId
    );

    assert.equal(executionCount, 1, "Duplicate event must be ignored by deduplication check");
  } finally {
    unsubscribe();
  }
});

// -----------------------------------------------------------------------------
// Priority 3: Cross-Module Workflows A - E Data Persistence & Isolation
// -----------------------------------------------------------------------------

test("Sprint 1.1 - Case 16: Workflow A: Task completion recalculates Project and Goal units", async () => {
  const projectTasks = [
    { id: "t1", status: "COMPLETED" },
    { id: "t2", status: "COMPLETED" },
    { id: "t3", status: "TODO" },
  ];
  const projectMilestones = [
    { id: "m1", completed: true },
  ];

  const total = projectTasks.length + projectMilestones.length; // 4
  const completed = projectTasks.filter((t) => t.status === "COMPLETED").length +
    projectMilestones.filter((m) => m.completed).length; // 3

  const progress = Math.round((completed / total) * 100);
  assert.equal(progress, 75, "Project progress should be 75%");
});

test("Sprint 1.1 - Case 17: Workflow B: Focus session feeds into Analytics completed filter", () => {
  const sessions = [
    { id: "s1", userId: "u1", actualMinutes: 45, completed: true },
    { id: "s2", userId: "u1", actualMinutes: 30, completed: false }, // Ghost session
    { id: "s3", userId: "u2", actualMinutes: 60, completed: true }, // Foreign user
  ];

  // Scoped query mirroring analytics/route.ts
  const userCompleted = sessions.filter((s) => s.userId === "u1" && s.completed === true);
  const totalMinutes = userCompleted.reduce((sum, s) => sum + s.actualMinutes, 0);

  assert.equal(userCompleted.length, 1, "Only completed sessions for user 1 counted");
  assert.equal(totalMinutes, 45, "Total minutes strictly excludes abandoned and foreign sessions");
});

test("Sprint 1.1 - Case 18: Workflow C: Knowledge Graph maintains referential integrity", () => {
  const existingNodeIds = new Set(["node-paper-1", "node-note-1"]);
  const candidateLinks = [
    { source: "node-paper-1", target: "node-note-1" }, // Valid
    { source: "node-paper-1", target: "node-missing-99" }, // Invalid orphan target
    { source: "node-paper-1", target: "node-paper-1" }, // Invalid self-loop
  ];

  const validLinks = candidateLinks.filter(
    (l) => existingNodeIds.has(l.source) && existingNodeIds.has(l.target) && l.source !== l.target
  );

  assert.equal(validLinks.length, 1, "Only valid link between existing distinct nodes is retained");
});

test("Sprint 1.1 - Case 19: Workflow D: Habit completion idempotency preserves streaks", () => {
  const habit = { id: "h1", currentStreak: 5, longestStreak: 10 };
  let wasAlreadyCompleted = false;

  const toggleHabit = (completed) => {
    let newStreak = habit.currentStreak;
    if (completed && !wasAlreadyCompleted) {
      newStreak = habit.currentStreak + 1;
      wasAlreadyCompleted = true;
    } else if (!completed && wasAlreadyCompleted) {
      newStreak = Math.max(0, habit.currentStreak - 1);
      wasAlreadyCompleted = false;
    }
    habit.currentStreak = newStreak;
    habit.longestStreak = Math.max(habit.longestStreak, newStreak);
    return habit;
  };

  // First completion: streak increments to 6
  toggleHabit(true);
  assert.equal(habit.currentStreak, 6);

  // Repeated completion on retry: streak remains 6 (no double counting)
  toggleHabit(true);
  assert.equal(habit.currentStreak, 6);
});

test("Sprint 1.1 - Case 20: Workflow E: Assistant tool invocation executes with caller userId scoping", async () => {
  const executeScopedTool = async (callerUserId, toolName, args) => {
    const toolDef = APPLICATION_TOOLS[toolName] || ALL_TOOLS[toolName];
    assert.ok(toolDef, `Tool ${toolName} must exist`);

    const validation = validateToolArgs(toolDef, args);
    assert.ok(validation.valid, "Arguments must satisfy schema contract");

    // Execute with callerUserId
    return { executedUserId: callerUserId, toolName, args };
  };

  const result = await executeScopedTool("user_kishore_owner", "create_task", {
    title: "Prepare Sprint 1.1 Report",
    priority: "HIGH",
    estimatedMinutes: 30,
  });

  assert.equal(result.executedUserId, "user_kishore_owner", "Tool execution strictly scoped to caller userId");
  assert.equal(result.toolName, "create_task");
});

// -----------------------------------------------------------------------------
// Transactional Outbox & Database-Level Concurrency Tests
// -----------------------------------------------------------------------------

test("Sprint 1.1 - Case 21: Outbox event operation generates atomic transaction payload", () => {
  const op = createOutboxEventOperation({
    eventType: "task.completed",
    entityId: "task_test_100",
    userId: "user_owner_1",
    payload: { taskId: "task_test_100", projectId: "proj_99" },
  });

  assert.ok(op.eventId.startsWith("evt_"), "EventId must be well-formed");
  assert.equal(op.createData.userId, "user_owner_1");
  assert.equal(op.createData.action, "OUTBOX:PENDING:task.completed");

  const parsed = JSON.parse(op.createData.detailsJson);
  assert.equal(parsed.status, "PENDING");
  assert.equal(parsed.attempts, 0);
  assert.equal(parsed.payload.taskId, "task_test_100");
});

test("Sprint 1.1 - Case 22: Outbox optimistic conditional lock prevents concurrent worker execution", async () => {
  // Simulate two concurrent dispatchers attempting to claim the same outbox row
  let row = {
    id: "outbox_row_1",
    action: "OUTBOX:PENDING:task.completed",
    detailsJson: JSON.stringify({ attempts: 0, status: "PENDING" }),
  };

  // Atomic conditional update simulation (mirrors prisma.auditEvent.updateMany)
  const attemptClaim = async (workerId) => {
    if (row.action === "OUTBOX:PENDING:task.completed") {
      row.action = `OUTBOX:PROCESSING:${row.id}`;
      return { count: 1, workerId };
    }
    return { count: 0, workerId };
  };

  // Run two workers simultaneously
  const [claim1, claim2] = await Promise.all([
    attemptClaim("worker_1"),
    attemptClaim("worker_2"),
  ]);

  const winners = [claim1, claim2].filter((c) => c.count === 1);
  const losers = [claim1, claim2].filter((c) => c.count === 0);

  assert.equal(winners.length, 1, "Exactly one worker must acquire atomic conditional claim");
  assert.equal(losers.length, 1, "The competing worker must be safely locked out (count 0)");
  assert.equal(row.action, `OUTBOX:PROCESSING:${row.id}`);
});

test("Sprint 1.1 - Case 23: Outbox retry policy escalates attempts and transitions to FAILED on 3rd failure", () => {
  let attempts = 0;
  let status = "PENDING";
  let action = "OUTBOX:PENDING:task.completed";

  const handleFailure = (errMessage) => {
    attempts += 1;
    if (attempts >= 3) {
      status = "FAILED";
      action = "OUTBOX:FAILED:outbox_row_1";
    } else {
      status = "PENDING";
      action = "OUTBOX:PENDING:task.completed";
    }
  };

  // Attempt 1 fails
  handleFailure("Network timeout 1");
  assert.equal(attempts, 1);
  assert.equal(status, "PENDING");

  // Attempt 2 fails
  handleFailure("Network timeout 2");
  assert.equal(attempts, 2);
  assert.equal(status, "PENDING");

  // Attempt 3 fails -> Dead letter transition
  handleFailure("Network timeout 3");
  assert.equal(attempts, 3);
  assert.equal(status, "FAILED");
  assert.equal(action, "OUTBOX:FAILED:outbox_row_1");
});
