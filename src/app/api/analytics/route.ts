import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [tasks, focusSessions, habits, revisions, reviews] = await Promise.all([
      prisma.task.findMany({ where: { userId } }),
      prisma.focusSession.findMany({ where: { userId } }),
      prisma.habit.findMany({
        where: { userId },
        include: { logs: { orderBy: { dateString: "desc" }, take: 14 } },
      }),
      prisma.revisionRecord.findMany({
        where: { topic: { unit: { course: { userId } } } },
      }),
      prisma.productivityReview.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
        take: 5,
      }),
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const totalActualMinutes = tasks.reduce((acc, t) => acc + t.actualMinutes, 0);
    const totalEstimatedMinutes = tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

    const totalFocusMinutes = focusSessions.reduce((acc, f) => acc + f.actualMinutes, 0);
    const focusSessionCount = focusSessions.length;

    const totalHabitLogs = habits.reduce((acc, h) => acc + h.logs.length, 0);
    const completedHabitLogs = habits.reduce(
      (acc, h) => acc + h.logs.filter((l) => l.completed).length,
      0
    );
    const longestStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);

    return NextResponse.json({
      totalTasks,
      completedTasks,
      completionRatePct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalActualMinutes,
      totalEstimatedMinutes,
      totalFocusMinutes,
      focusSessionCount,
      habitCount: habits.length,
      totalHabitLogs,
      completedHabitLogs,
      longestStreak,
      totalRevisions: revisions.length,
      habits,
      reviews,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST endpoint to record a guided Daily / Weekly Review
export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { periodType, highlights, challenges, adjustments, aiSummary } = body;

    const now = new Date();
    const days = periodType === "DAILY" ? 1 : periodType === "MONTHLY" ? 30 : 7;
    const startDate = new Date(now.getTime() - days * 86400000);

    // Compute actual real-world performance metrics for the period
    const [tasksInPeriod, focusSessionsInPeriod, revisionsInPeriod] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: now },
        },
      }),
      prisma.focusSession.findMany({
        where: {
          userId,
          startTime: { gte: startDate, lte: now },
        },
      }),
      prisma.revisionRecord.findMany({
        where: {
          studiedAt: { gte: startDate, lte: now },
          topic: { unit: { course: { userId } } },
        },
      }),
    ]);

    const tasksPlanned = tasksInPeriod.length;
    const tasksCompleted = tasksInPeriod.filter((t) => t.status === "COMPLETED").length;
    const totalFocusMin = focusSessionsInPeriod.reduce((acc, f) => acc + f.actualMinutes, 0);
    const revisionsMade = revisionsInPeriod.length;

    const review = await prisma.productivityReview.create({
      data: {
        userId,
        periodType: periodType || "WEEKLY",
        startDate,
        endDate: now,
        tasksPlanned,
        tasksCompleted,
        totalFocusMin,
        revisionsMade,
        highlightsJson: JSON.stringify(highlights || []),
        challengesJson: JSON.stringify(challenges || []),
        adjustmentsJson: JSON.stringify(adjustments || []),
        aiSummary:
          aiSummary ||
          `Recorded ${tasksCompleted}/${tasksPlanned} tasks, ${totalFocusMin} focus minutes, and ${revisionsMade} SuperMemo revisions.`,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
