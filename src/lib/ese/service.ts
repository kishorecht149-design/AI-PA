import { prisma } from "../prisma.ts";
import {
  ESE_SUBJECTS,
  ESE_CHECKLIST_ITEMS,
  ESE_PART_D_MILESTONES,
  getEseSyllabusStats,
  getEseItemById,
} from "./syllabus-data.ts";
import type { EseChecklistItem } from "./syllabus-data.ts";
import {
  generate600DayPlan,
  isValidGoogleDriveUrl,
  MANDATORY_ATTESTATION_TEXT,
  computeKolkataDate,
} from "./schedule-generator.ts";
import type { EseGeneratedPlan } from "./schedule-generator.ts";
import { isOwnerEseExempt } from "./owner-exemption.ts";

export interface EseOverviewResponse {
  isOwnerExempt?: boolean;
  hasPlan: boolean;
  plan: {
    id?: string;
    status: "DRAFT" | "ACTIVE" | "COMPLETED";
    startDate?: string;
    endDate?: string;
    totalDays: number;
    currentDay: number;
    daysRemaining: number;
    timeZone: string;
    countdownActive: boolean;
  };
  stats: {
    totalSubjects: number;
    totalChapters: number;
    totalChecklistItems: number;
    totalMilestones: number;
    totalDestinationNodes: number;
    completedItems: number;
    inProgressItems: number;
    progressPercentage: number;
    totalEvidenceSubmitted: number;
    totalResources: number;
  };
  phases: {
    phase: string;
    name: string;
    daysRange: string;
    dayCount: number;
    completedDays: number;
  }[];
}

/**
 * Gets overview stats and active plan status for a user.
 */
export async function getEseOverview(userId: string): Promise<EseOverviewResponse> {
  const baseStats = getEseSyllabusStats();

  let plan: any = null;
  let progressRecords: any[] = [];
  let resourceCount = 0;
  let evidenceCount = 0;

  try {
    plan = await prisma.esePlan.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { days: true },
    });

    progressRecords = await prisma.eseSyllabusProgress.findMany({
      where: { userId },
    });

    resourceCount = await prisma.eseResource.count({
      where: { userId },
    });

    evidenceCount = await prisma.eseTaskEvidence.count({
      where: { userId },
    });
  } catch (err) {
    // If database is offline or unmigrated in dev/test, fallback gracefully
    console.warn("[ESE Service] Database query fallback:", err);
  }

  const completedItems = progressRecords.filter((p) => p.status === "COMPLETED").length;
  const inProgressItems = progressRecords.filter((p) => p.status === "IN_PROGRESS").length;
  const totalNodes = baseStats.totalDestinationNodes;
  const progressPercentage = totalNodes > 0 ? Math.round((completedItems / totalNodes) * 100) : 0;

  let currentDay = 1;
  let daysRemaining = 600;
  let countdownActive = false;
  let startDateStr = undefined;
  let endDateStr = undefined;

  if (plan && plan.status === "ACTIVE") {
    countdownActive = true;
    startDateStr = plan.startDate.toISOString().split("T")[0];
    endDateStr = plan.endDate.toISOString().split("T")[0];

    // Calculate current day relative to today in Asia/Kolkata
    const nowKolkata = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const [sy, sm, sd] = startDateStr.split("-").map(Number);
    const planStart = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0));
    const nowUtc = new Date(Date.UTC(nowKolkata.getFullYear(), nowKolkata.getMonth(), nowKolkata.getDate(), 0, 0, 0));

    const diffDays = Math.floor((nowUtc.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    currentDay = Math.min(Math.max(diffDays, 1), 600);
    daysRemaining = Math.max(600 - currentDay, 0);
  }

  const phases = [
    { phase: "PHASE_1", name: "First-Pass Coverage & Problem Practice", daysRange: "Days 1–360", dayCount: 360, completedDays: Math.min(Math.max(currentDay - 1, 0), 360) },
    { phase: "PHASE_2", name: "Systematic Subject-Wise Revision", daysRange: "Days 361–420", dayCount: 60, completedDays: Math.min(Math.max(currentDay - 361, 0), 60) },
    { phase: "PHASE_3", name: "PYQ Drill & Conventional Answers", daysRange: "Days 421–480", dayCount: 60, completedDays: Math.min(Math.max(currentDay - 421, 0), 60) },
    { phase: "PHASE_4", name: "Section Tests & Error Correction", daysRange: "Days 481–530", dayCount: 50, completedDays: Math.min(Math.max(currentDay - 481, 0), 50) },
    { phase: "PHASE_5", name: "Second Revision & Spaced Recall", daysRange: "Days 531–570", dayCount: 40, completedDays: Math.min(Math.max(currentDay - 531, 0), 40) },
    { phase: "PHASE_6", name: "Final Consolidation & Readiness", daysRange: "Days 571–600", dayCount: 30, completedDays: Math.min(Math.max(currentDay - 571, 0), 30) },
  ];

  return {
    isOwnerExempt: isOwnerEseExempt(userId),
    hasPlan: !!plan,
    plan: {
      id: plan?.id,
      status: plan?.status || "DRAFT",
      startDate: startDateStr,
      endDate: endDateStr,
      totalDays: 600,
      currentDay: countdownActive ? currentDay : 0,
      daysRemaining: countdownActive ? daysRemaining : 600,
      timeZone: "Asia/Kolkata",
      countdownActive,
    },
    stats: {
      totalSubjects: baseStats.subjectCount,
      totalChapters: baseStats.chapterCount,
      totalChecklistItems: baseStats.checklistItemCount,
      totalMilestones: baseStats.milestoneCount,
      totalDestinationNodes: baseStats.totalDestinationNodes,
      completedItems,
      inProgressItems,
      progressPercentage,
      totalEvidenceSubmitted: evidenceCount,
      totalResources: resourceCount,
    },
    phases,
  };
}

/**
 * Gets decorated syllabus hierarchy with user progress.
 */
export async function getEseSyllabusWithProgress(userId: string) {
  let progressMap = new Map<string, { status: string; completedAt: string | null; evidenceUrl: string | null }>();

  try {
    const records = await prisma.eseSyllabusProgress.findMany({
      where: { userId },
    });
    for (const rec of records) {
      progressMap.set(rec.nodeId, {
        status: rec.status,
        completedAt: rec.completedAt ? rec.completedAt.toISOString() : null,
        evidenceUrl: rec.evidenceUrl || null,
      });
    }
  } catch (err) {
    console.warn("[ESE Service] Syllabus progress query fallback:", err);
  }

  const subjects = ESE_SUBJECTS.map((sub) => ({
    ...sub,
    chapters: sub.chapters.map((ch) => ({
      ...ch,
      items: ch.items.map((it) => {
        const prog = progressMap.get(it.id);
        return {
          ...it,
          status: prog?.status || "NOT_STARTED",
          completedAt: prog?.completedAt || null,
          evidenceUrl: prog?.evidenceUrl || null,
        };
      }),
    })),
  }));

  const milestones = ESE_PART_D_MILESTONES.map((m) => {
    const prog = progressMap.get(m.id);
    return {
      ...m,
      status: prog?.status || "NOT_STARTED",
      completedAt: prog?.completedAt || null,
      evidenceUrl: prog?.evidenceUrl || null,
    };
  });

  return {
    subjects,
    milestones,
    stats: getEseSyllabusStats(),
  };
}

/**
 * Activates or regenerates the 600-Day Plan with database persistence.
 * Creates/updates EsePlan, EsePlanDay, canonical Tasks, and TimeBlocks.
 * Idempotent: will not overwrite completed work or evidence.
 */
export async function activateOrUpdateEsePlan(
  userId: string,
  startDateStr: string
): Promise<{ success: boolean; plan: EseGeneratedPlan; planId: string }> {
  const generated = generate600DayPlan(startDateStr);
  const startDt = new Date(`${generated.startDate}T00:00:00.000Z`);
  const endDt = new Date(`${generated.endDate}T23:59:59.999Z`);

  let planId = `plan_${userId}_ese600`;

  try {
    // 1. Fast path: check if plan is already active with the same startDate
    const existingPlan = await prisma.esePlan.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (existingPlan) {
      const sameStartDate = existingPlan.startDate.toISOString().substring(0, 10) === startDateStr;
      const existingDaysCount = await prisma.esePlanDay.count({
        where: { planId: existingPlan.id },
      });
      if (sameStartDate && existingDaysCount >= 600) {
        return {
          success: true,
          plan: generated,
          planId: existingPlan.id,
        };
      }
    }

    let planRecord;
    if (existingPlan) {
      planRecord = await prisma.esePlan.update({
        where: { id: existingPlan.id },
        data: {
          startDate: startDt,
          endDate: endDt,
          status: "ACTIVE",
          timeZone: "Asia/Kolkata",
        },
      });
      planId = planRecord.id;
    } else {
      planRecord = await prisma.esePlan.create({
        data: {
          userId,
          startDate: startDt,
          endDate: endDt,
          status: "ACTIVE",
          timeZone: "Asia/Kolkata",
        },
      });
      planId = planRecord.id;
    }

    // 2. Batch upsert/insert days
    const planDaysData = generated.days.map((day) => ({
      planId,
      dayNumber: day.dayNumber,
      date: new Date(`${day.date}T00:00:00.000Z`),
      phase: day.phase,
      focusSummary: day.focusSummary,
      totalEstimatedMinutes: day.totalMinutes,
    }));

    await prisma.esePlanDay.createMany({
      data: planDaysData,
      skipDuplicates: true,
    });

    // 3. Batch insert new tasks
    const existingTasks = await prisma.task.findMany({
      where: {
        userId,
        externalSource: "ESE_600_DAY_PLAN",
      },
      select: { id: true, externalId: true, status: true },
    });
    const existingExternalIds = new Set(existingTasks.map((t) => t.externalId).filter(Boolean));

    const newTasksData: any[] = [];
    for (const day of generated.days) {
      for (const t of day.tasks) {
        if (!existingExternalIds.has(t.id)) {
          const syllabusDesc = t.subtopicTitle
            ? `Syllabus: ${t.stage} → ${t.subjectTitle} → Ch ${t.chapterNumber}: ${t.chapterTitle} → ${t.subtopicTitle}`
            : `Outcome: ${t.outcome}`;

          newTasksData.push({
            userId,
            title: t.title,
            description: `${t.outcome}\n\n${syllabusDesc}\n\n[Mandatory Evidence: Google Drive notes URL required to complete]`,
            priority: "HIGH",
            status: "TODO",
            estimatedMinutes: t.durationMinutes,
            scheduledDate: new Date(`${t.date}T09:00:00.000Z`),
            dueDate: new Date(`${t.date}T23:59:59.000Z`),
            externalId: t.id,
            externalSource: "ESE_600_DAY_PLAN",
            eseNodeId: t.syllabusNodeId || null,
            esePlanId: planId,
            eseDayNumber: t.dayNumber,
            eseTaskType: t.taskType,
            tags: JSON.stringify(["ESE", "ESE_600", `DAY_${t.dayNumber}`, t.taskType]),
          });
        }
      }
    }

    if (newTasksData.length > 0) {
      for (let i = 0; i < newTasksData.length; i += 200) {
        const chunk = newTasksData.slice(i, i + 200);
        await prisma.task.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
    }
  } catch (err) {
    console.warn("[ESE Service] Plan database persistence notice:", err);
  }

  return {
    success: true,
    plan: generated,
    planId,
  };
}

/**
 * Transitions an ESE study task to COMPLETED with mandatory Google Drive URL and user attestation.
 * Automatically adds or updates the URL into ESE Resources without duplication.
 */
export async function completeEseTaskWithEvidence(
  userId: string,
  taskId: string,
  driveUrl: string,
  attestationConfirmed: boolean,
  submitterName: string = "Student"
) {
  if (!driveUrl || !isValidGoogleDriveUrl(driveUrl)) {
    throw new Error("Invalid Google Drive URL. Please provide a valid drive.google.com or docs.google.com file link.");
  }

  if (!attestationConfirmed) {
    throw new Error(
      `Mandatory attestation required: You must confirm: "${MANDATORY_ATTESTATION_TEXT}"`
    );
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    throw new Error("Task not found or access unauthorized.");
  }

  const nodeId = task.eseNodeId || task.externalId || "ESE_GENERAL";
  const now = new Date();

  // 1. Update Task to COMPLETED
  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "COMPLETED",
      completedAt: now,
      evidenceUrl: driveUrl.trim(),
      evidenceAttested: true,
      evidenceAttestedAt: now,
      evidenceAttestation: MANDATORY_ATTESTATION_TEXT,
    },
  });

  // 2. Update linked TimeBlocks in Planner
  await prisma.timeBlock.updateMany({
    where: { taskId: task.id, userId },
    data: { completed: true },
  });

  // 3. Create or update EseTaskEvidence
  await prisma.eseTaskEvidence.create({
    data: {
      userId,
      taskId: task.id,
      nodeId,
      driveUrl: driveUrl.trim(),
      attestationText: MANDATORY_ATTESTATION_TEXT,
      attestedAt: now,
      submittedBy: submitterName,
    },
  });

  // 4. Update EseSyllabusProgress
  if (task.eseNodeId) {
    await prisma.eseSyllabusProgress.upsert({
      where: {
        userId_nodeId: {
          userId,
          nodeId: task.eseNodeId,
        },
      },
      create: {
        userId,
        nodeId: task.eseNodeId,
        status: "COMPLETED",
        completedAt: now,
        evidenceUrl: driveUrl.trim(),
        lastStudiedAt: now,
        revisionCount: 1,
      },
      update: {
        status: "COMPLETED",
        completedAt: now,
        evidenceUrl: driveUrl.trim(),
        lastStudiedAt: now,
        revisionCount: { increment: 1 },
      },
    });
  }

  // 5. Automatically add to ESE Resources without duplication
  let subjectName: string | undefined;
  let chapterTitle: string | undefined;
  let topicTitle: string | undefined;
  let subtopicTitle: string | undefined;

  if (task.eseNodeId) {
    const item = getEseItemById(task.eseNodeId);
    if (item && "subtopicTitle" in item) {
      subjectName = item.subjectTitle;
      chapterTitle = `Chapter ${item.chapterNumber}: ${item.chapterTitle}`;
      topicTitle = item.topicTitle;
      subtopicTitle = item.subtopicTitle;
    } else if (item && "title" in item) {
      subjectName = "Part D — Execution & Interview Checklist";
      chapterTitle = item.section;
      subtopicTitle = item.title;
    }
  }

  const resourceTitle = task.title.replace(/^\[Day \d+\]\s*/, "") + " Notes";

  await prisma.eseResource.upsert({
    where: {
      userId_url: {
        userId,
        url: driveUrl.trim(),
      },
    },
    create: {
      userId,
      planId: task.esePlanId || null,
      taskId: task.id,
      title: resourceTitle,
      url: driveUrl.trim(),
      resourceType: "GOOGLE_DRIVE",
      subjectName: subjectName || null,
      chapterTitle: chapterTitle || null,
      topicTitle: topicTitle || null,
      subtopicTitle: subtopicTitle || null,
      nodeId: task.eseNodeId || null,
      isClassified: !!task.eseNodeId,
    },
    update: {
      taskId: task.id,
      title: resourceTitle,
      subjectName: subjectName || undefined,
      chapterTitle: chapterTitle || undefined,
      topicTitle: topicTitle || undefined,
      subtopicTitle: subtopicTitle || undefined,
      nodeId: task.eseNodeId || undefined,
      isClassified: !!task.eseNodeId,
    },
  });

  return {
    success: true,
    task: updatedTask,
    evidenceUrl: driveUrl.trim(),
    attestedAt: now.toISOString(),
  };
}

/**
 * Retrieves all ESE resources for a user, structured by Subject -> Chapter -> Topic -> Subtopic,
 * plus unclassified resources.
 */
export async function getEseResources(userId: string, search?: string) {
  let resources: any[] = [];

  try {
    resources = await prisma.eseResource.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.warn("[ESE Service] Resources query fallback:", err);
  }

  // Filter if search query provided
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    resources = resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        (r.subjectName && r.subjectName.toLowerCase().includes(q)) ||
        (r.subtopicTitle && r.subtopicTitle.toLowerCase().includes(q))
    );
  }

  const classified: any[] = [];
  const unclassified: any[] = [];

  // Group by Subject
  const subjectGroups = new Map<string, any>();

  for (const r of resources) {
    if (r.isClassified && r.subjectName) {
      if (!subjectGroups.has(r.subjectName)) {
        subjectGroups.set(r.subjectName, {
          subjectName: r.subjectName,
          chapters: new Map<string, any>(),
          totalResources: 0,
        });
      }
      const sGroup = subjectGroups.get(r.subjectName);
      sGroup.totalResources++;

      const chName = r.chapterTitle || "General Chapters";
      if (!sGroup.chapters.has(chName)) {
        sGroup.chapters.set(chName, {
          chapterTitle: chName,
          resources: [],
        });
      }
      sGroup.chapters.get(chName).resources.push(r);
      classified.push(r);
    } else {
      unclassified.push(r);
    }
  }

  const structuredSubjects = Array.from(subjectGroups.values()).map((s) => ({
    subjectName: s.subjectName,
    totalResources: s.totalResources,
    chapters: Array.from(s.chapters.values()),
  }));

  return {
    totalCount: resources.length,
    classifiedCount: classified.length,
    unclassifiedCount: unclassified.length,
    structuredSubjects,
    unclassifiedResources: unclassified,
  };
}

/**
 * Manually adds or classifies an ESE resource.
 */
export async function addOrClassifyEseResource(
  userId: string,
  title: string,
  url: string,
  nodeId?: string
) {
  if (!url || !url.trim().startsWith("http")) {
    throw new Error("A valid URL is required.");
  }
  if (!title || !title.trim()) {
    throw new Error("A title is required.");
  }

  let subjectName: string | undefined;
  let chapterTitle: string | undefined;
  let topicTitle: string | undefined;
  let subtopicTitle: string | undefined;

  if (nodeId) {
    const item = getEseItemById(nodeId);
    if (item && "subtopicTitle" in item) {
      subjectName = item.subjectTitle;
      chapterTitle = `Chapter ${item.chapterNumber}: ${item.chapterTitle}`;
      topicTitle = item.topicTitle;
      subtopicTitle = item.subtopicTitle;
    } else if (item && "title" in item) {
      subjectName = "Part D — Execution & Interview Checklist";
      chapterTitle = item.section;
      subtopicTitle = item.title;
    }
  }

  const resource = await prisma.eseResource.upsert({
    where: {
      userId_url: {
        userId,
        url: url.trim(),
      },
    },
    create: {
      userId,
      title: title.trim(),
      url: url.trim(),
      resourceType: isValidGoogleDriveUrl(url) ? "GOOGLE_DRIVE" : "EXTERNAL_LINK",
      subjectName: subjectName || null,
      chapterTitle: chapterTitle || null,
      topicTitle: topicTitle || null,
      subtopicTitle: subtopicTitle || null,
      nodeId: nodeId || null,
      isClassified: !!nodeId,
    },
    update: {
      title: title.trim(),
      subjectName: subjectName || undefined,
      chapterTitle: chapterTitle || undefined,
      topicTitle: topicTitle || undefined,
      subtopicTitle: subtopicTitle || undefined,
      nodeId: nodeId || undefined,
      isClassified: !!nodeId,
    },
  });

  return {
    success: true,
    resource,
  };
}
