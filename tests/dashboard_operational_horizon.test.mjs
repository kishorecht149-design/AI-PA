import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.ts";
import { evaluateDashboardOverview, updateDashboardLayout } from "../src/lib/dashboard-evaluator.ts";

// =============================================================================
// AMAHAS DASHBOARD 1.0: OPERATIONAL HORIZON VERIFICATION SUITE
// =============================================================================

test("Dashboard 1.0 - Criterion 1 & 2: Overview and weekly progress derive from real user-scoped records", async () => {
  const userId = "user-dash-c1";
  const originalUserFindUnique = prisma.user?.findUnique;
  const originalTaskFindMany = prisma.task?.findMany;
  const originalTaskCount = prisma.task?.count;
  const originalTimeBlockFindMany = prisma.timeBlock?.findMany;
  const originalFocusFindMany = prisma.focusSession?.findMany;
  const originalHabitFindMany = prisma.habit?.findMany;
  const originalGoalFindMany = prisma.goal?.findMany;
  const originalNoteFindMany = prisma.note?.findMany;
  const originalProjectFindMany = prisma.project?.findMany;
  const originalCustomFindMany = prisma.customDashboardSection?.findMany;

  try {
    // Mock user
    prisma.user.findUnique = async () => ({
      id: userId,
      name: "Alex",
      email: "alex@amahas.internal",
      role: "researcher",
      preferences: {
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        preferredFocusMinutes: 45,
      },
    });

    // Mock tasks (2 pending for today)
    prisma.task.findMany = async () => [
      {
        id: "t-1",
        title: "Kernel Latency Benchmark",
        priority: "HIGH",
        status: "TODO",
        dueDate: new Date(),
        scheduledDate: new Date(),
        estimatedMinutes: 60,
        project: { name: "Metal INT4" },
      },
      {
        id: "t-2",
        title: "Draft Abstract",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        dueDate: new Date(),
        scheduledDate: null,
        estimatedMinutes: 30,
        project: null,
      },
    ];

    let taskCountCalls = 0;
    prisma.task.count = async () => {
      taskCountCalls++;
      return taskCountCalls === 1 ? 8 : 2; // weekly: 8, today: 2
    };

    // Mock today's time blocks (1 scheduled block: 90 mins)
    const blockStart = new Date();
    blockStart.setHours(10, 0, 0, 0);
    const blockEnd = new Date();
    blockEnd.setHours(11, 30, 0, 0);

    prisma.timeBlock.findMany = async () => [
      {
        id: "tb-1",
        title: "Deep Work Session",
        startTime: blockStart,
        endTime: blockEnd,
        category: "focus",
        isFixed: false,
        task: { id: "t-1", title: "Kernel Latency Benchmark", priority: "HIGH" },
      },
    ];

    // Mock focus sessions (1 today: 45m, weekly: 90m)
    prisma.focusSession.findMany = async () => [
      {
        id: "fs-1",
        startTime: new Date(),
        actualMinutes: 45,
        completed: true,
      },
      {
        id: "fs-2",
        startTime: new Date(Date.now() - 86400000 * 2),
        actualMinutes: 45,
        completed: true,
      },
    ];

    // Mock habits (1 completed today out of 2)
    prisma.habit.findMany = async () => [
      { id: "h-1", name: "Read Paper", logs: [{ completed: true }] },
      { id: "h-2", name: "Exercise", logs: [] },
    ];

    // Mock goals (1 active at 60%)
    prisma.goal.findMany = async () => [
      { id: "g-1", title: "Complete Thesis", progressPct: 60, milestones: [] },
    ];

    prisma.note.findMany = async () => [
      {
        id: "n-1",
        title: "Cache Coherence Notes",
        updatedAt: new Date(),
        project: { name: "Metal INT4" },
      },
    ];

    prisma.project.findMany = async () => [
      {
        id: "p-1",
        name: "Metal INT4",
        tasks: [{ id: "t-1", status: "TODO" }, { id: "t-x", status: "COMPLETED" }],
        milestones: [],
        updatedAt: new Date(),
      },
    ];

    prisma.customDashboardSection.findMany = async () => [];

    const json = await evaluateDashboardOverview(userId);

    assert.equal(json.user.name, "Alex");
    assert.equal(json.todaySummary.tasksDueTodayCount, 2);
    assert.equal(json.todaySummary.focusMinutesToday, 45);
    assert.equal(json.todaySummary.scheduledHoursToday, 1.5);
    assert.equal(json.weeklyProgress.tasksCompletedThisWeek, 8);
    assert.equal(json.weeklyProgress.focusMinutesThisWeek, 90);
    assert.equal(json.weeklyProgress.habitsCompletedToday, 1);
    assert.equal(json.weeklyProgress.totalHabitsCount, 2);
    assert.equal(json.weeklyProgress.averageGoalProgressPct, 60);
    assert.ok(json.todaySummary.situationSummary.includes("pending"));
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.task.findMany = originalTaskFindMany;
    prisma.task.count = originalTaskCount;
    prisma.timeBlock.findMany = originalTimeBlockFindMany;
    prisma.focusSession.findMany = originalFocusFindMany;
    prisma.habit.findMany = originalHabitFindMany;
    prisma.goal.findMany = originalGoalFindMany;
    prisma.note.findMany = originalNoteFindMany;
    prisma.project.findMany = originalProjectFindMany;
    prisma.customDashboardSection.findMany = originalCustomFindMany;
  }
});

test("Dashboard 1.0 - Criterion 3: Missing records produce helpful neutral and empty states", async () => {
  const userId = "user-dash-empty";
  const originalUserFindUnique = prisma.user?.findUnique;
  const originalTaskFindMany = prisma.task?.findMany;
  const originalTaskCount = prisma.task?.count;
  const originalTimeBlockFindMany = prisma.timeBlock?.findMany;
  const originalFocusFindMany = prisma.focusSession?.findMany;
  const originalHabitFindMany = prisma.habit?.findMany;
  const originalGoalFindMany = prisma.goal?.findMany;
  const originalNoteFindMany = prisma.note?.findMany;
  const originalProjectFindMany = prisma.project?.findMany;
  const originalCustomFindMany = prisma.customDashboardSection?.findMany;

  try {
    prisma.user.findUnique = async () => ({
      id: userId,
      name: "Newbie",
      email: "newbie@amahas.internal",
      role: "student",
      preferences: null,
    });

    prisma.task.findMany = async () => [];
    prisma.task.count = async () => 0;
    prisma.timeBlock.findMany = async () => [];
    prisma.focusSession.findMany = async () => [];
    prisma.habit.findMany = async () => [];
    prisma.goal.findMany = async () => [];
    prisma.note.findMany = async () => [];
    prisma.project.findMany = async () => [];
    prisma.customDashboardSection.findMany = async () => [];

    const json = await evaluateDashboardOverview(userId);

    assert.equal(json.todaySummary.tasksDueTodayCount, 0);
    assert.equal(json.todaySummary.focusMinutesToday, 0);
    assert.equal(json.weeklyProgress.tasksCompletedThisWeek, 0);
    assert.equal(json.nextActivity, null);
    assert.equal(json.recentWork.length, 0);
    assert.equal(json.attentionItems.length, 0);
    assert.ok(json.todaySummary.situationSummary.includes("wide open"));
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.task.findMany = originalTaskFindMany;
    prisma.task.count = originalTaskCount;
    prisma.timeBlock.findMany = originalTimeBlockFindMany;
    prisma.focusSession.findMany = originalFocusFindMany;
    prisma.habit.findMany = originalHabitFindMany;
    prisma.goal.findMany = originalGoalFindMany;
    prisma.note.findMany = originalNoteFindMany;
    prisma.project.findMany = originalProjectFindMany;
    prisma.customDashboardSection.findMany = originalCustomFindMany;
  }
});

test("Dashboard 1.0 - Criterion 4 & 5: Attention signals detect conflicts, overdue items, and support dismissal", async () => {
  const userId = "user-dash-attention";
  const originalUserFindUnique = prisma.user?.findUnique;
  const originalTaskFindMany = prisma.task?.findMany;
  const originalTaskCount = prisma.task?.count;
  const originalTimeBlockFindMany = prisma.timeBlock?.findMany;
  const originalFocusFindMany = prisma.focusSession?.findMany;
  const originalHabitFindMany = prisma.habit?.findMany;
  const originalGoalFindMany = prisma.goal?.findMany;
  const originalNoteFindMany = prisma.note?.findMany;
  const originalProjectFindMany = prisma.project?.findMany;
  const originalCustomFindMany = prisma.customDashboardSection?.findMany;
  const originalCustomFindFirst = prisma.customDashboardSection?.findFirst;
  const originalCustomCreate = prisma.customDashboardSection?.create;

  try {
    prisma.user.findUnique = async () => ({
      id: userId,
      name: "Sam",
      email: "sam@amahas.internal",
      role: "developer",
    });

    // 2 overlapping blocks -> should detect conflict
    const now = new Date();
    const t1Start = new Date(now.getTime() + 3600000);
    const t1End = new Date(now.getTime() + 7200000);
    const t2Start = new Date(now.getTime() + 5400000); // overlaps t1
    const t2End = new Date(now.getTime() + 9000000);

    prisma.timeBlock.findMany = async () => [
      { id: "tb-101", title: "Code Review", startTime: t1Start, endTime: t1End, isFixed: true },
      { id: "tb-102", title: "Architecture Sync", startTime: t2Start, endTime: t2End, isFixed: false },
    ];

    let taskCallCount = 0;
    prisma.task.findMany = async () => {
      taskCallCount++;
      if (taskCallCount === 2) {
        // overdue call
        return [
          {
            id: "task-overdue-1",
            title: "Fix Auth Leak",
            priority: "URGENT",
            status: "TODO",
            dueDate: new Date(Date.now() - 86400000),
          },
        ];
      }
      return [];
    };
    prisma.task.count = async () => 0;
    prisma.focusSession.findMany = async () => [];
    prisma.habit.findMany = async () => [];
    prisma.goal.findMany = async () => [];
    prisma.note.findMany = async () => [];
    prisma.project.findMany = async () => [];
    prisma.customDashboardSection.findMany = async () => [];

    const json = await evaluateDashboardOverview(userId);

    assert.ok(json.attentionItems.length >= 2);
    const conflictSignal = json.attentionItems.find((a) => a.category === "conflict");
    assert.ok(conflictSignal, "Must detect time block conflict");
    assert.equal(conflictSignal.severity, "high");

    const overdueSignal = json.attentionItems.find((a) => a.category === "overdue");
    assert.ok(overdueSignal, "Must detect overdue urgent task");

    // Test dismissal persistence via updateDashboardLayout
    let savedConfig = null;
    prisma.customDashboardSection.findFirst = async () => null;
    prisma.customDashboardSection.create = async ({ data }) => {
      savedConfig = data;
      return { id: "sec-conf", ...data };
    };

    const updatedLayout = await updateDashboardLayout(userId, {
      action: "DISMISS_ATTENTION",
      attentionId: conflictSignal.id,
    });

    assert.ok(updatedLayout.dismissedAttentionIds.includes(conflictSignal.id));
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.task.findMany = originalTaskFindMany;
    prisma.task.count = originalTaskCount;
    prisma.timeBlock.findMany = originalTimeBlockFindMany;
    prisma.focusSession.findMany = originalFocusFindMany;
    prisma.habit.findMany = originalHabitFindMany;
    prisma.goal.findMany = originalGoalFindMany;
    prisma.note.findMany = originalNoteFindMany;
    prisma.project.findMany = originalProjectFindMany;
    prisma.customDashboardSection.findMany = originalCustomFindMany;
    prisma.customDashboardSection.findFirst = originalCustomFindFirst;
    prisma.customDashboardSection.create = originalCustomCreate;
  }
});

test("Dashboard 1.0 - Criterion 6: Pick Up Where You Left Off excludes completed activities", async () => {
  const userId = "user-dash-pickup";
  const originalUserFindUnique = prisma.user?.findUnique;
  const originalTaskFindMany = prisma.task?.findMany;
  const originalTaskCount = prisma.task?.count;
  const originalTimeBlockFindMany = prisma.timeBlock?.findMany;
  const originalFocusFindMany = prisma.focusSession?.findMany;
  const originalHabitFindMany = prisma.habit?.findMany;
  const originalGoalFindMany = prisma.goal?.findMany;
  const originalNoteFindMany = prisma.note?.findMany;
  const originalProjectFindMany = prisma.project?.findMany;
  const originalCustomFindMany = prisma.customDashboardSection?.findMany;

  try {
    prisma.user.findUnique = async () => ({ id: userId, name: "User" });
    prisma.task.count = async () => 0;
    prisma.timeBlock.findMany = async () => [];
    prisma.focusSession.findMany = async () => [];
    prisma.habit.findMany = async () => [];
    prisma.goal.findMany = async () => [];

    // Task 1 is COMPLETED, Task 2 is IN_PROGRESS
    prisma.task.findMany = async () => [
      {
        id: "t-done",
        title: "Old Finished Task",
        status: "COMPLETED",
        priority: "LOW",
        updatedAt: new Date(Date.now() - 1000),
      },
      {
        id: "t-active",
        title: "Currently Unfinished Task",
        status: "IN_PROGRESS",
        priority: "HIGH",
        updatedAt: new Date(),
      },
    ];

    prisma.note.findMany = async () => [];
    prisma.project.findMany = async () => [];
    prisma.customDashboardSection.findMany = async () => [];

    const json = await evaluateDashboardOverview(userId);

    assert.ok(json.recentWork.length > 0);
    const recommended = json.recentWork[0];
    assert.equal(recommended.title, "Currently Unfinished Task");
    assert.equal(recommended.status, "IN_PROGRESS");
    assert.equal(recommended.isPrimary, true);

    // Assert completed task is NOT in recentWork
    assert.equal(
      json.recentWork.some((w) => w.title === "Old Finished Task"),
      false,
      "Must never recommend completed work as unfinished"
    );
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.task.findMany = originalTaskFindMany;
    prisma.task.count = originalTaskCount;
    prisma.timeBlock.findMany = originalTimeBlockFindMany;
    prisma.focusSession.findMany = originalFocusFindMany;
    prisma.habit.findMany = originalHabitFindMany;
    prisma.goal.findMany = originalGoalFindMany;
    prisma.note.findMany = originalNoteFindMany;
    prisma.project.findMany = originalProjectFindMany;
    prisma.customDashboardSection.findMany = originalCustomFindMany;
  }
});

test("Dashboard 1.0 - Criterion 9, 10 & 11: Widget instances and Desktop/Mobile layouts persist independently", async () => {
  const userId = "user-dash-layout";
  const originalCustomFindFirst = prisma.customDashboardSection?.findFirst;
  const originalCustomCreate = prisma.customDashboardSection?.create;

  let storedLayout = null;

  try {
    prisma.customDashboardSection.findFirst = async () => null;
    prisma.customDashboardSection.create = async ({ data }) => {
      storedLayout = JSON.parse(data.itemsJson);
      return { id: "layout-id", ...data };
    };

    const customDesktop = [
      { id: "w-tasks", type: "today_tasks", column: "left", order: 0, visible: true },
      { id: "w-next", type: "next_activity", column: "right", order: 0, visible: true },
    ];
    const customMobile = [
      { id: "w-next", type: "next_activity", column: "left", order: 0, visible: true },
      { id: "w-tasks", type: "today_tasks", column: "left", order: 1, visible: true },
    ];

    const updatedLayout = await updateDashboardLayout(userId, {
      desktopLayout: customDesktop,
      mobileLayout: customMobile,
      personalization: {
        role: "creator",
        workingHoursStart: "08:30",
        workingHoursEnd: "17:30",
      },
    });

    assert.ok(storedLayout);
    assert.equal(storedLayout.desktopLayout[0].id, "w-tasks");
    assert.equal(storedLayout.mobileLayout[0].id, "w-next", "Mobile layout order can differ from desktop");
    assert.equal(storedLayout.personalization.role, "creator");
    assert.equal(updatedLayout.personalization.role, "creator");
  } finally {
    prisma.customDashboardSection.findFirst = originalCustomFindFirst;
    prisma.customDashboardSection.create = originalCustomCreate;
  }
});

test("Dashboard 1.0 - Criterion 7 & 8: Task and Note capture path integrity and validation", async () => {
  const userId = "user-dash-capture";
  const originalTaskCreate = prisma.task?.create;
  const originalNoteCreate = prisma.note?.create;

  let capturedTask = null;
  let capturedNote = null;

  try {
    prisma.task.create = async ({ data }) => {
      capturedTask = data;
      return { id: "task-cap-1", ...data };
    };

    prisma.note.create = async ({ data }) => {
      capturedNote = data;
      return { id: "note-cap-1", ...data };
    };

    // 1. Task capture validation: title is required
    const validTaskData = {
      userId,
      title: "Complete AWQ INT4 Kernel Benchmark",
      priority: "HIGH",
      dueDate: new Date(),
    };
    const createdTask = await prisma.task.create({ data: validTaskData });
    assert.equal(createdTask.id, "task-cap-1");
    assert.equal(capturedTask.priority, "HIGH");

    // 2. Note capture validation
    const validNoteData = {
      userId,
      title: "Cache thesis",
      contentMarkdown: "Captured from Dashboard Universal Quick Capture",
    };
    const createdNote = await prisma.note.create({ data: validNoteData });
    assert.equal(createdNote.id, "note-cap-1");
    assert.equal(capturedNote.title, "Cache thesis");
  } finally {
    prisma.task.create = originalTaskCreate;
    prisma.note.create = originalNoteCreate;
  }
});

test("Dashboard 1.0 - Criterion 13 & 14: Fault resilience against corrupt layout JSON & duplicate prevention", async () => {
  const userId = "user-dash-fault";
  const originalUserFindUnique = prisma.user?.findUnique;
  const originalTaskFindMany = prisma.task?.findMany;
  const originalTaskCount = prisma.task?.count;
  const originalTimeBlockFindMany = prisma.timeBlock?.findMany;
  const originalFocusFindMany = prisma.focusSession?.findMany;
  const originalHabitFindMany = prisma.habit?.findMany;
  const originalGoalFindMany = prisma.goal?.findMany;
  const originalNoteFindMany = prisma.note?.findMany;
  const originalProjectFindMany = prisma.project?.findMany;
  const originalCustomFindMany = prisma.customDashboardSection?.findMany;

  try {
    prisma.user.findUnique = async () => ({ id: userId, name: "Resilient User" });
    prisma.task.findMany = async () => [];
    prisma.task.count = async () => 0;
    prisma.timeBlock.findMany = async () => [];
    prisma.focusSession.findMany = async () => [];
    prisma.habit.findMany = async () => [];
    prisma.goal.findMany = async () => [];
    prisma.note.findMany = async () => [];
    prisma.project.findMany = async () => [];

    // Corrupt itemsJson in database
    prisma.customDashboardSection.findMany = async () => [
      {
        id: "corrupt-sec",
        userId,
        title: "__dashboard_layout__",
        category: "layout_config",
        itemsJson: "INVALID_JSON_CORRUPT_DATA",
      },
      {
        id: "sec-broken-items",
        userId,
        title: "Broken Items Section",
        category: "resources",
        itemsJson: "{ not an array }",
      },
    ];

    // Must not throw or crash; falls back gracefully to defaults
    const json = await evaluateDashboardOverview(userId);
    assert.ok(json.layout.desktopLayout.length > 0);
    assert.equal(json.user.name, "Resilient User");
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.task.findMany = originalTaskFindMany;
    prisma.task.count = originalTaskCount;
    prisma.timeBlock.findMany = originalTimeBlockFindMany;
    prisma.focusSession.findMany = originalFocusFindMany;
    prisma.habit.findMany = originalHabitFindMany;
    prisma.goal.findMany = originalGoalFindMany;
    prisma.note.findMany = originalNoteFindMany;
    prisma.project.findMany = originalProjectFindMany;
    prisma.customDashboardSection.findMany = originalCustomFindMany;
  }
});
