import { prisma } from "./prisma.ts";
import {
  type AttentionItem,
  type RecentWorkItem,
  type NextActivityItem,
  type TaskSummary,
  type DashboardOverviewData,
  DEFAULT_DESKTOP_WIDGETS,
  DEFAULT_MOBILE_WIDGETS,
  type DashboardLayoutConfig,
} from "../types/dashboard.ts";
import { getHourlyContent, getTimeOfDayGreeting } from "./hourly-quotes.ts";

export async function evaluateDashboardOverview(userId: string): Promise<DashboardOverviewData> {
  const now = new Date();
  const todayDateString = now.toISOString().split("T")[0];
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfWeek = new Date(now.getTime() - 7 * 86400000);

  // Fetch user and related records in parallel
  const [
    user,
    todayTasksRaw,
    tasksCompletedThisWeek,
    tasksCompletedToday,
    todayTimeBlocks,
    weeklyFocusSessions,
    habits,
    activeGoals,
    recentNotes,
    activeProjects,
    customSectionsRaw,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true, profile: true },
    }),
    prisma.task.findMany({
      where: {
        userId,
        OR: [
          { dueDate: { gte: startOfDay, lte: endOfDay } },
          { scheduledDate: { gte: startOfDay, lte: endOfDay } },
          { status: "IN_PROGRESS" },
          { status: "TODO", priority: { in: ["HIGH", "URGENT"] } },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true } } },
      take: 20,
    }),
    prisma.task.count({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: startOfWeek },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: startOfDay },
      },
    }),
    prisma.timeBlock.findMany({
      where: {
        userId,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { startTime: "asc" },
      include: { task: { select: { id: true, title: true, priority: true } } },
    }),
    prisma.focusSession.findMany({
      where: {
        userId,
        startTime: { gte: startOfWeek },
        completed: true,
      },
    }),
    prisma.habit.findMany({
      where: { userId, isPaused: false },
      include: {
        logs: {
          where: { dateString: todayDateString },
        },
      },
    }),
    prisma.goal.findMany({
      where: { userId, status: "IN_PROGRESS" },
      include: { milestones: true },
      take: 5,
    }),
    prisma.note.findMany({
      where: { userId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { project: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        tasks: { select: { id: true, status: true } },
        milestones: true,
      },
      take: 5,
    }),
    prisma.customDashboardSection.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  // Extract layout config if stored in custom sections
  let layoutConfig: DashboardLayoutConfig = {
    desktopLayout: DEFAULT_DESKTOP_WIDGETS,
    mobileLayout: DEFAULT_MOBILE_WIDGETS,
    dismissedAttentionIds: [],
    personalization: {
      role: user.role || "student",
      workingHoursStart: user.preferences?.workingHoursStart || "09:00",
      workingHoursEnd: user.preferences?.workingHoursEnd || "22:00",
      dailyFocusTargetMinutes: user.preferences?.preferredFocusMinutes ? user.preferences.preferredFocusMinutes * 3 : 180,
    },
  };

  const regularSections: any[] = [];
  for (const sec of customSectionsRaw || []) {
    if (sec.category === "layout_config") {
      try {
        const parsed = JSON.parse(sec.itemsJson || "{}");
        if (parsed.desktopLayout) {
          // Ensure balanced layout: if w-projects is still on right with order 4 from legacy default, balance it to left
          const isLegacyDefault =
            Array.isArray(parsed.desktopLayout) &&
            parsed.desktopLayout.some((w: any) => w.id === "w-projects" && w.column === "right" && w.order === 4);
          if (isLegacyDefault) {
            parsed.desktopLayout = parsed.desktopLayout.map((w: any) => {
              if (w.id === "w-projects") return { ...w, column: "left", order: 3 };
              if (w.id === "w-custom") return { ...w, column: "left", order: 4 };
              return w;
            });
          }
          layoutConfig.desktopLayout = parsed.desktopLayout;
        }
        if (parsed.mobileLayout) layoutConfig.mobileLayout = parsed.mobileLayout;
        if (Array.isArray(parsed.dismissedAttentionIds)) layoutConfig.dismissedAttentionIds = parsed.dismissedAttentionIds;
        if (parsed.personalization) layoutConfig.personalization = { ...layoutConfig.personalization, ...parsed.personalization };
      } catch {
        // ignore corrupted JSON
      }
    } else {
      try {
        regularSections.push({
          ...sec,
          items: JSON.parse(sec.itemsJson || "[]"),
        });
      } catch {
        regularSections.push({ ...sec, items: [] });
      }
    }
  }

  // Calculate Focus minutes
  const focusMinutesToday = (weeklyFocusSessions || [])
    .filter((s) => new Date(s.startTime) >= startOfDay)
    .reduce((sum, s) => sum + s.actualMinutes, 0);

  const focusMinutesThisWeek = (weeklyFocusSessions || []).reduce((sum, s) => sum + s.actualMinutes, 0);

  // Calculate Scheduled & Available Hours
  let scheduledMinutesToday = 0;
  for (const b of todayTimeBlocks || []) {
    const dur = Math.max(0, (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000);
    scheduledMinutesToday += dur;
  }
  const scheduledHoursToday = Math.round((scheduledMinutesToday / 60) * 10) / 10;

  // Working hours window calculation
  const [startH, startM] = (layoutConfig.personalization.workingHoursStart || "09:00").split(":").map(Number);
  const [endH, endM] = (layoutConfig.personalization.workingHoursEnd || "22:00").split(":").map(Number);
  const totalWorkingMinutes = Math.max(120, (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0)));
  const availableHoursToday = Math.max(0, Math.round(((totalWorkingMinutes - scheduledMinutesToday) / 60) * 10) / 10);

  // Habits calculation
  const habitsCompletedToday = (habits || []).filter((h) => h.logs && h.logs.length > 0 && h.logs[0].completed).length;

  // Goals progress
  const avgGoalProgress = activeGoals && activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progressPct, 0) / activeGoals.length)
    : 0;

  // -------------------------------------------------------------------------
  // Evaluate Attention Items
  // -------------------------------------------------------------------------
  const attentionItems: AttentionItem[] = [];

  // 1. Conflict detection in today's time blocks
  const blocks = todayTimeBlocks || [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (new Date(a.startTime) < new Date(b.endTime) && new Date(a.endTime) > new Date(b.startTime)) {
        const conflictId = `conflict_${a.id}_${b.id}`;
        attentionItems.push({
          id: conflictId,
          category: "conflict",
          severity: a.isFixed || b.isFixed ? "high" : "medium",
          title: `Schedule Conflict: "${a.title}" & "${b.title}"`,
          reason: "Overlapping time blocks will disrupt your planned focus. Reallocate one block to maintain buffer.",
          actionLabel: "Reschedule in Planner",
          actionType: "reschedule",
          link: "/planner",
          dismissible: true,
        });
      }
    }
  }

  // 2. Overdue commitments
  const overdueTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { lt: startOfDay },
      priority: { in: ["HIGH", "URGENT"] },
    },
    take: 3,
  });
  for (const t of overdueTasks || []) {
    attentionItems.push({
      id: `overdue_${t.id}`,
      category: "overdue",
      severity: t.priority === "URGENT" ? "high" : "medium",
      title: `Overdue Priority Task: "${t.title}"`,
      reason: `Due date passed. Re-evaluate urgency or reschedule into an open time block.`,
      actionLabel: "Reschedule Task",
      actionType: "schedule_block",
      recordId: t.id,
      recordType: "task",
      link: `/tasks?id=${t.id}`,
      dismissible: true,
    });
  }

  // 3. Unscheduled high-priority tasks
  const unscheduledHighTasks = (todayTasksRaw || []).filter(
    (t) => (t.priority === "HIGH" || t.priority === "URGENT") && t.status === "TODO" && !t.scheduledDate
  );
  if (unscheduledHighTasks.length > 0) {
    const topUnscheduled = unscheduledHighTasks[0];
    attentionItems.push({
      id: `unscheduled_${topUnscheduled.id}`,
      category: "unscheduled",
      severity: "medium",
      title: `Unscheduled Priority Task: "${topUnscheduled.title}"`,
      reason: "High priority task has no dedicated time block today. Slot it before your available buffer diminishes.",
      actionLabel: "Slot into Planner",
      actionType: "schedule_block",
      recordId: topUnscheduled.id,
      recordType: "task",
      link: "/planner",
      dismissible: true,
    });
  }

  // Filter dismissed items
  const dismissedSet = new Set(layoutConfig.dismissedAttentionIds);
  const activeAttentionItems = attentionItems.filter((item) => !dismissedSet.has(item.id));

  // -------------------------------------------------------------------------
  // Evaluate Next Activity
  // -------------------------------------------------------------------------
  let nextActivity: NextActivityItem | null = null;
  for (const b of blocks) {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    if (end.getTime() > now.getTime()) {
      const startsInMinutes = Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000));
      const isOngoing = start.getTime() <= now.getTime() && end.getTime() > now.getTime();
      nextActivity = {
        id: b.id,
        title: b.title,
        startTime: b.startTime.toISOString ? b.startTime.toISOString() : new Date(b.startTime).toISOString(),
        endTime: b.endTime.toISOString ? b.endTime.toISOString() : new Date(b.endTime).toISOString(),
        category: b.category,
        isFixed: b.isFixed,
        taskId: b.taskId,
        taskTitle: b.task?.title || null,
        startsInMinutes,
        isOngoing,
      };
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Evaluate Pick Up Where You Left Off (Recent In-Progress Work)
  // -------------------------------------------------------------------------
  const recentWork: RecentWorkItem[] = [];

  // Helper to detect generic placeholder or empty titles
  const isGenericTitle = (title?: string | null): boolean => {
    if (!title) return true;
    const clean = title.trim().toLowerCase();
    const genericSet = new Set([
      "new note",
      "untitled",
      "untitled note",
      "quick note",
      "new task",
      "untitled task",
      "draft",
      "note",
      "task",
    ]);
    return genericSet.has(clean) || clean.length < 2;
  };

  // Priority 1: Genuinely in-progress tasks (must have non-generic title)
  const inProgressTasks = (todayTasksRaw || []).filter(
    (t) => t.status === "IN_PROGRESS" && !isGenericTitle(t.title)
  );
  for (const t of inProgressTasks) {
    recentWork.push({
      id: `task_${t.id}`,
      type: "task",
      title: t.title,
      subtitle: t.project?.name ? `Project: ${t.project.name}` : "Task in progress",
      updatedAt: t.updatedAt
        ? t.updatedAt.toISOString
          ? t.updatedAt.toISOString()
          : new Date(t.updatedAt).toISOString()
        : now.toISOString(),
      href: `/tasks?id=${t.id}`,
      status: "IN_PROGRESS",
    });
  }

  // Priority 2: Substantive recent notes (must have non-generic title and substantive content > 15 chars)
  for (const n of recentNotes || []) {
    if (isGenericTitle(n.title)) continue;
    const content = (n.contentMarkdown || "").trim();
    if (content.length < 15) continue;

    const hasUncheckedItems = /- \[[ ]\]/.test(content);
    let subtitle = n.project?.name ? `Note in ${n.project.name}` : "Knowledge note";
    if (hasUncheckedItems) {
      subtitle = "Active working checklist";
    }

    recentWork.push({
      id: `note_${n.id}`,
      type: "note",
      title: n.title,
      subtitle,
      updatedAt: n.updatedAt?.toISOString
        ? n.updatedAt.toISOString()
        : new Date(n.updatedAt || now).toISOString(),
      href: `/notes?id=${n.id}`,
    });
  }

  // Priority 3: Active projects with genuine pending unfinished tasks
  for (const p of activeProjects || []) {
    const totalT = p.tasks ? p.tasks.length : 0;
    const pendingT = p.tasks ? p.tasks.filter((t: any) => t.status !== "COMPLETED").length : 0;
    const compT = totalT - pendingT;

    // Only include if project has at least 1 pending task (genuine unfinished work)
    if (totalT > 0 && pendingT > 0) {
      recentWork.push({
        id: `project_${p.id}`,
        type: "project",
        title: p.name,
        subtitle: `${pendingT} pending task${pendingT === 1 ? "" : "s"} (${compT}/${totalT} finished)`,
        updatedAt: p.updatedAt
          ? p.updatedAt.toISOString
            ? p.updatedAt.toISOString()
            : new Date(p.updatedAt).toISOString()
          : now.toISOString(),
        href: `/projects?id=${p.id}`,
      });
    }
  }

  // Mark first qualified item as primary
  if (recentWork.length > 0) {
    recentWork[0].isPrimary = true;
  }

  // -------------------------------------------------------------------------
  // Format Today Tasks Summary
  // -------------------------------------------------------------------------
  const todayTasks: TaskSummary[] = (todayTasksRaw || []).slice(0, 10).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as any,
    status: t.status as any,
    dueDate: t.dueDate ? (t.dueDate.toISOString ? t.dueDate.toISOString() : new Date(t.dueDate).toISOString()) : null,
    scheduledDate: t.scheduledDate ? (t.scheduledDate.toISOString ? t.scheduledDate.toISOString() : new Date(t.scheduledDate).toISOString()) : null,
    estimatedMinutes: t.estimatedMinutes,
    projectName: t.project?.name || null,
  }));

  // -------------------------------------------------------------------------
  // Natural Language Situation Summary
  // -------------------------------------------------------------------------
  const hourlyData = getHourlyContent(now);
  const greeting = getTimeOfDayGreeting(now, user.name);

  let situationSummary = "";
  if (todayTasks.length === 0 && blocks.length === 0) {
    situationSummary = "Your day is wide open with no scheduled commitments. Use Universal Quick Capture to set your top intention.";
  } else {
    const pendingCount = todayTasks.filter((t) => t.status !== "COMPLETED").length;
    const hoursDesc = scheduledHoursToday > 0 ? `${scheduledHoursToday}h scheduled` : "no fixed blocks";
    const focusDesc = focusMinutesToday > 0 ? `${Math.round(focusMinutesToday / 60 * 10) / 10}h focus logged today` : "ready to launch focus";
    situationSummary = `You have ${pendingCount} pending task${pendingCount === 1 ? "" : "s"} and ${hoursDesc} today (${focusDesc}). You have completed ${tasksCompletedThisWeek} task${tasksCompletedThisWeek === 1 ? "" : "s"} this week.`;
  }

  return {
    user: {
      id: user.id,
      name: user.name || "Member",
      email: user.email,
      role: user.role,
    },
    todaySummary: {
      greeting,
      dateString: hourlyData.dateString,
      situationSummary,
      focusMinutesToday,
      focusTargetMinutes: layoutConfig.personalization.dailyFocusTargetMinutes || 180,
      tasksDueTodayCount: todayTasks.filter((t) => t.status !== "COMPLETED").length,
      tasksCompletedTodayCount: tasksCompletedToday,
      scheduledHoursToday,
      availableHoursToday,
      quote: {
        quote: hourlyData.quote.quote,
        author: hourlyData.quote.author,
      },
    },
    weeklyProgress: {
      tasksCompletedThisWeek,
      focusMinutesThisWeek,
      habitsCompletedToday,
      totalHabitsCount: (habits || []).length,
      activeGoalsCount: (activeGoals || []).length,
      averageGoalProgressPct: avgGoalProgress,
    },
    attentionItems: activeAttentionItems,
    recentWork,
    nextActivity,
    todayTasks,
    customSections: regularSections,
    layout: layoutConfig,
  };
}

export async function updateDashboardLayout(userId: string, body: any): Promise<DashboardLayoutConfig> {
  const { desktopLayout, mobileLayout, dismissedAttentionIds, personalization, action, attentionId } = body;

  let configSection = await prisma.customDashboardSection.findFirst({
    where: { userId, category: "layout_config" },
  });

  let currentConfig: DashboardLayoutConfig = {
    desktopLayout: DEFAULT_DESKTOP_WIDGETS,
    mobileLayout: DEFAULT_MOBILE_WIDGETS,
    dismissedAttentionIds: [],
    personalization: {},
  };

  if (configSection?.itemsJson) {
    try {
      currentConfig = { ...currentConfig, ...JSON.parse(configSection.itemsJson) };
    } catch {
      // use default
    }
  }

  if (action === "DISMISS_ATTENTION" && attentionId) {
    if (!currentConfig.dismissedAttentionIds.includes(attentionId)) {
      currentConfig.dismissedAttentionIds.push(attentionId);
    }
  } else {
    if (Array.isArray(desktopLayout)) currentConfig.desktopLayout = desktopLayout;
    if (Array.isArray(mobileLayout)) currentConfig.mobileLayout = mobileLayout;
    if (Array.isArray(dismissedAttentionIds)) currentConfig.dismissedAttentionIds = dismissedAttentionIds;
    if (personalization) currentConfig.personalization = { ...currentConfig.personalization, ...personalization };
  }

  if (configSection) {
    await prisma.customDashboardSection.update({
      where: { id: configSection.id },
      data: {
        itemsJson: JSON.stringify(currentConfig),
      },
    });
  } else {
    await prisma.customDashboardSection.create({
      data: {
        userId,
        title: "__dashboard_layout__",
        category: "layout_config",
        icon: "Layout",
        itemsJson: JSON.stringify(currentConfig),
      },
    });
  }

  return currentConfig;
}
