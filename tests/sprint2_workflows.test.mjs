import test from "node:test";
import assert from "node:assert/strict";
import { eventBus } from "../src/lib/events.ts";
import { APPLICATION_TOOLS, getToolsForIntent } from "../src/lib/tools-registry.ts";
import { prisma } from "../src/lib/prisma.ts";

// =============================================================================
// SPRINT 2 WORKFLOW VERIFICATION SUITE
// =============================================================================

test("Sprint 2 - Workflow A: Task completion synchronizes Project, Goals, TimeBlocks, and Reminders", async () => {
  const userId = "user-wf-a1";
  const projectId = "proj-wf-a1";
  const taskId = "task-wf-a1";
  const goalId = "goal-wf-a1";
  const timeBlockId = "tb-wf-a1";
  const notifId = "notif-wf-a1";

  let projectUpdated = null;
  let goalUpdated = null;
  let timeBlockUpdated = null;
  let notifUpdated = null;

  const originalProjectFindFirst = prisma.project?.findFirst;
  const originalProjectUpdate = prisma.project?.update;
  const originalGoalFindMany = prisma.goal?.findMany;
  const originalGoalUpdate = prisma.goal?.update;
  const originalTimeBlockUpdateMany = prisma.timeBlock?.updateMany;
  const originalNotifUpdateMany = prisma.notification?.updateMany;

  try {
    prisma.project.findFirst = async ({ where }) => {
      if (where.id === projectId && where.userId === userId) {
        return {
          id: projectId,
          userId,
          status: "ACTIVE",
          tasks: [{ id: taskId, status: "COMPLETED" }],
          milestones: [{ id: "m1", completed: true }],
        };
      }
      return null;
    };

    prisma.project.update = async ({ where, data }) => {
      projectUpdated = { where, data };
      return { id: where.id, ...data };
    };

    prisma.goal.findMany = async ({ where }) => {
      if (where.projectId === projectId && where.userId === userId) {
        return [
          {
            id: goalId,
            userId,
            projectId,
            status: "IN_PROGRESS",
            progressPct: 50,
            milestones: [],
          },
        ];
      }
      return [];
    };

    prisma.goal.update = async ({ where, data }) => {
      goalUpdated = { where, data };
      return { id: where.id, ...data };
    };

    prisma.timeBlock.updateMany = async ({ where, data }) => {
      timeBlockUpdated = { where, data };
      return { count: 1 };
    };

    prisma.notification.updateMany = async ({ where, data }) => {
      notifUpdated = { where, data };
      return { count: 1 };
    };

    // Publish task.completed
    await eventBus.publish("task.completed", taskId, userId, {
      taskId,
      projectId,
    });

    // Verify 1: Timeblock marked completed
    assert.ok(timeBlockUpdated, "TimeBlock updateMany must be called");
    assert.equal(timeBlockUpdated.where.taskId, taskId);
    assert.equal(timeBlockUpdated.where.userId, userId);
    assert.equal(timeBlockUpdated.data.completed, true);

    // Verify 2: Unread notifications for this task marked as read
    assert.ok(notifUpdated, "Notification updateMany must be called");
    assert.equal(notifUpdated.where.userId, userId);
    assert.equal(notifUpdated.where.isRead, false);
    assert.equal(notifUpdated.data.isRead, true);

    // Verify 3: Project status transitioned to COMPLETED (100% units done)
    assert.ok(projectUpdated, "Project status must be updated");
    assert.equal(projectUpdated.data.status, "COMPLETED");

    // Verify 4: Aligned Goal synchronized to 100% and ACHIEVED
    assert.ok(goalUpdated, "Goal progress must be updated");
    assert.equal(goalUpdated.data.progressPct, 100);
    assert.equal(goalUpdated.data.status, "ACHIEVED");
  } finally {
    prisma.project.findFirst = originalProjectFindFirst;
    prisma.project.update = originalProjectUpdate;
    prisma.goal.findMany = originalGoalFindMany;
    prisma.goal.update = originalGoalUpdate;
    prisma.timeBlock.updateMany = originalTimeBlockUpdateMany;
    prisma.notification.updateMany = originalNotifUpdateMany;
  }
});

test("Sprint 2 - Workflow A: Task rescheduling updates linked TimeBlock duration and start", async () => {
  const userId = "user-wf-a2";
  const taskId = "task-wf-a2";
  const oldStart = new Date("2026-10-20T10:00:00Z");
  const oldEnd = new Date("2026-10-20T11:00:00Z"); // 60 min duration
  const newDueDate = "2026-10-22T14:00:00Z";

  let updatedBlock = null;
  const originalFindFirst = prisma.timeBlock?.findFirst;
  const originalUpdate = prisma.timeBlock?.update;

  try {
    prisma.timeBlock.findFirst = async ({ where }) => {
      if (where.taskId === taskId && where.userId === userId) {
        return {
          id: "tb-resched-1",
          taskId,
          userId,
          startTime: oldStart,
          endTime: oldEnd,
        };
      }
      return null;
    };

    prisma.timeBlock.update = async ({ where, data }) => {
      updatedBlock = { where, data };
      return { id: where.id, ...data };
    };

    await eventBus.publish("task.rescheduled", taskId, userId, {
      taskId,
      newDueDate,
    });

    assert.ok(updatedBlock, "Linked TimeBlock must be rescheduled");
    assert.equal(updatedBlock.data.startTime.toISOString(), new Date(newDueDate).toISOString());
    // 60-minute duration must be preserved
    const duration = updatedBlock.data.endTime.getTime() - updatedBlock.data.startTime.getTime();
    assert.equal(duration, 60 * 60 * 1000);
  } finally {
    prisma.timeBlock.findFirst = originalFindFirst;
    prisma.timeBlock.update = originalUpdate;
  }
});

test("Sprint 2 - Workflow A: Reminder deduplication updates existing unread task alert", async () => {
  const userId = "user-wf-a3";
  const taskId = "task-wf-a3";

  let createdNotif = null;
  let updatedNotif = null;

  const originalFindFirst = prisma.notification?.findFirst;
  const originalUpdate = prisma.notification?.update;
  const originalCreate = prisma.notification?.create;
  const originalTaskFindFirst = prisma.task?.findFirst;

  try {
    prisma.task.findFirst = async ({ where }) => {
      if (where.id === taskId && where.userId === userId) {
        return { id: taskId, userId, title: "Fourier Transform HW" };
      }
      return null;
    };

    // Scenario 1: First reminder call -> no existing unread reminder
    prisma.notification.findFirst = async () => null;
    prisma.notification.create = async ({ data }) => {
      createdNotif = { id: "notif-created-1", ...data };
      return createdNotif;
    };

    const reminderTool = APPLICATION_TOOLS["create_reminder"];
    const res1 = await reminderTool.execute(userId, {
      title: "Submit HW1",
      message: "Finish before 5pm",
      taskId,
      category: "DEADLINE",
    });

    assert.ok(res1.success);
    assert.ok(createdNotif);
    assert.equal(createdNotif.link, `/tasks?id=${taskId}`);

    // Scenario 2: Second reminder call -> existing unread reminder found
    prisma.notification.findFirst = async ({ where }) => {
      if (where.userId === userId && where.link === `/tasks?id=${taskId}` && where.isRead === false) {
        return createdNotif;
      }
      return null;
    };

    prisma.notification.update = async ({ where, data }) => {
      updatedNotif = { id: where.id, ...data };
      return updatedNotif;
    };

    const res2 = await reminderTool.execute(userId, {
      title: "Submit HW1 (Updated 6pm)",
      message: "Extended deadline",
      taskId,
      category: "DEADLINE",
    });

    assert.ok(res2.success);
    assert.equal(res2.deduplicated, true, "Must flag as deduplicated");
    assert.ok(updatedNotif, "Must update existing notification instead of creating a duplicate");
    assert.equal(updatedNotif.title, "Submit HW1 (Updated 6pm)");
  } finally {
    prisma.notification.findFirst = originalFindFirst;
    prisma.notification.update = originalUpdate;
    prisma.notification.create = originalCreate;
    prisma.task.findFirst = originalTaskFindFirst;
  }
});

test("Sprint 2 - Workflow B: Focus session completion updates topic status to IN_PROGRESS without faking SM-2 mastery", async () => {
  const userId = "user-wf-b1";
  const topicId = "topic-wf-b1";

  let topicUpdated = null;
  const originalFindFirst = prisma.syllabusTopic?.findFirst;
  const originalUpdate = prisma.syllabusTopic?.update;

  try {
    prisma.syllabusTopic.findFirst = async ({ where }) => {
      if (where.id === topicId && where.unit?.course?.userId === userId) {
        return {
          id: topicId,
          title: "Virtual Memory Paging",
          status: "UNSTUDIED",
          confidenceLevel: 0,
        };
      }
      return null;
    };

    prisma.syllabusTopic.update = async ({ where, data }) => {
      topicUpdated = { where, data };
      return { id: where.id, ...data };
    };

    await eventBus.publish("focus_session.completed", "session-1", userId, {
      durationMinutes: 45,
      topicId,
    });

    assert.ok(topicUpdated, "Syllabus topic must be updated");
    assert.equal(topicUpdated.data.status, "IN_PROGRESS", "Status advances to IN_PROGRESS");
    assert.ok(topicUpdated.data.lastStudiedAt, "Must record lastStudiedAt");
    // Academic mastery must NOT be fabricated from a timer
    assert.equal(topicUpdated.data.confidenceLevel, undefined, "Confidence level must remain untouched");
  } finally {
    prisma.syllabusTopic.findFirst = originalFindFirst;
    prisma.syllabusTopic.update = originalUpdate;
  }
});

test("Sprint 2 - Workflow B: Academic revision scheduling upserts typed revision notification", async () => {
  const userId = "user-wf-b2";
  const topicId = "topic-wf-b2";
  const reviewDate = new Date("2026-10-25T09:00:00Z");

  let createdNotif = null;
  let updatedNotif = null;

  const originalFindFirst = prisma.notification?.findFirst;
  const originalCreate = prisma.notification?.create;
  const originalUpdate = prisma.notification?.update;

  try {
    // 1. First revision schedule -> creates notification
    prisma.notification.findFirst = async () => null;
    prisma.notification.create = async ({ data }) => {
      createdNotif = { id: "rev-notif-1", ...data };
      return createdNotif;
    };

    await eventBus.publish("academic_revision.scheduled", topicId, userId, {
      topicId,
      topicTitle: "Raft Consensus",
      courseName: "Distributed Systems",
      nextRevisionDate: reviewDate,
    });

    assert.ok(createdNotif);
    assert.equal(createdNotif.category, "REVISION");
    assert.equal(createdNotif.link, `/academics?topicId=${topicId}`);
    assert.ok(createdNotif.message.includes("Raft Consensus"));

    // 2. Next review schedule on same topic -> updates existing notification
    prisma.notification.findFirst = async () => createdNotif;
    prisma.notification.update = async ({ where, data }) => {
      updatedNotif = { id: where.id, ...data };
      return updatedNotif;
    };

    const newDate = new Date("2026-11-05T09:00:00Z");
    await eventBus.publish("academic_revision.scheduled", topicId, userId, {
      topicId,
      topicTitle: "Raft Consensus",
      courseName: "Distributed Systems",
      nextRevisionDate: newDate,
    });

    assert.ok(updatedNotif);
    assert.equal(updatedNotif.id, "rev-notif-1");
  } finally {
    prisma.notification.findFirst = originalFindFirst;
    prisma.notification.create = originalCreate;
    prisma.notification.update = originalUpdate;
  }
});

test("Sprint 2 - Workflow C: Note creation links to Research Project with tenant validation", async () => {
  const userId = "user-wf-c1";
  const otherUserId = "user-wf-c2";
  const researchProjectId = "rp-wf-c1";

  const originalRpFindFirst = prisma.researchProject?.findFirst;
  const originalNoteCreate = prisma.note?.create;

  try {
    prisma.researchProject.findFirst = async ({ where }) => {
      if (where.id === researchProjectId && where.userId === userId) {
        return { id: researchProjectId, userId, title: "LLM Quantization" };
      }
      return null;
    };

    let savedNote = null;
    prisma.note.create = async ({ data }) => {
      savedNote = data;
      return { id: "note-1", ...data };
    };

    const noteTool = APPLICATION_TOOLS["create_note"];

    // Case 1: Legitimate ownership links correctly
    const res1 = await noteTool.execute(userId, {
      title: "AWQ Benchmark Observations",
      content: "Low perplexity degradation at 4-bit INT4",
      researchProjectId,
    });

    assert.ok(res1.success);
    assert.equal(savedNote.researchProjectId, researchProjectId);
    assert.equal(savedNote.userId, userId);

    // Case 2: Cross-tenant attack (user attempts to link foreign research project)
    savedNote = null;
    const res2 = await noteTool.execute(otherUserId, {
      title: "Unauthorized Linking Attempt",
      content: "Trying to attach to another user's research",
      researchProjectId,
    });

    assert.ok(res2.success);
    // Since rp does not belong to otherUserId, researchProjectId is safely stripped to null
    assert.equal(savedNote.researchProjectId, null, "Foreign research project link must be rejected");
  } finally {
    prisma.researchProject.findFirst = originalRpFindFirst;
    prisma.note.create = originalNoteCreate;
  }
});

test("Sprint 2 - Workflow D: Habit completion updates aligned Goal milestone", async () => {
  const userId = "user-wf-d1";
  const habitId = "habit-wf-d1";
  const habitName = "Deep Work";

  let milestoneUpdated = null;
  let goalUpdated = null;

  const originalGoalFindMany = prisma.goal?.findMany;
  const originalMilestoneUpdate = prisma.goalMilestone?.update;
  const originalGoalUpdate = prisma.goal?.update;

  try {
    prisma.goal.findMany = async ({ where }) => {
      if (where.userId === userId && where.status === "IN_PROGRESS") {
        return [
          {
            id: "goal-deep-work",
            userId,
            title: "Achieve 40 Hours Deep Work",
            progressPct: 50,
            status: "IN_PROGRESS",
            milestones: [
              { id: "m-done", title: "Setup workspace", completed: true },
              { id: "m-pending", title: "Complete Deep Work session", completed: false },
            ],
          },
        ];
      }
      return [];
    };

    prisma.goalMilestone.update = async ({ where, data }) => {
      milestoneUpdated = { where, data };
      return { id: where.id, ...data };
    };

    prisma.goal.update = async ({ where, data }) => {
      goalUpdated = { where, data };
      return { id: where.id, ...data };
    };

    await eventBus.publish("habit.completed", habitId, userId, {
      habitId,
      habitName,
    });

    assert.ok(milestoneUpdated, "Aligned milestone must be updated");
    assert.equal(milestoneUpdated.where.id, "m-pending");
    assert.equal(milestoneUpdated.data.completed, true);

    assert.ok(goalUpdated, "Goal progress must be updated");
    // 2 of 2 milestones completed -> 100% and ACHIEVED
    assert.equal(goalUpdated.data.progressPct, 100);
    assert.equal(goalUpdated.data.status, "ACHIEVED");
  } finally {
    prisma.goal.findMany = originalGoalFindMany;
    prisma.goalMilestone.update = originalMilestoneUpdate;
    prisma.goal.update = originalGoalUpdate;
  }
});

test("Sprint 2 - Workflow E: Assistant tools maintain strict intent segregation and user scoping", () => {
  const appTools = getToolsForIntent("application_action");
  const taskTools = getToolsForIntent("task_management");
  const queryTools = getToolsForIntent("application_query");
  const researchTools = getToolsForIntent("web_research");

  // Application actions must NEVER include external web search
  assert.equal(appTools["search_web"], undefined);
  assert.equal(appTools["fetch_webpage_content"], undefined);

  // Task management contains create_task, update_task, create_reminder
  assert.ok(taskTools["create_task"]);
  assert.ok(taskTools["update_task"]);
  assert.ok(taskTools["create_reminder"]);
  assert.equal(taskTools["search_web"], undefined);

  // Application queries must only contain read-only tools
  for (const [name, tool] of Object.entries(queryTools)) {
    assert.equal(tool.isReadOnly, true, `Tool ${name} in application_query must be read-only`);
  }

  // Web research must contain search_web and fetch_webpage_content
  assert.ok(researchTools["search_web"]);
  assert.ok(researchTools["fetch_webpage_content"]);
  // Web research must never expose mutation tools
  assert.equal(researchTools["create_task"], undefined);
  assert.equal(researchTools["delete_task"], undefined);
});
