import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [tasks, focusSessions, reviews] = await Promise.all([
      prisma.task.findMany({ where: { userId } }),
      prisma.focusSession.findMany({ where: { userId } }),
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

    return NextResponse.json({
      totalTasks,
      completedTasks,
      completionRatePct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalActualMinutes,
      totalEstimatedMinutes,
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
    const review = await prisma.productivityReview.create({
      data: {
        userId,
        periodType: periodType || "WEEKLY",
        startDate: new Date(now.getTime() - 7 * 86400000),
        endDate: now,
        highlightsJson: JSON.stringify(highlights || []),
        challengesJson: JSON.stringify(challenges || []),
        adjustmentsJson: JSON.stringify(adjustments || []),
        aiSummary: aiSummary || "Consistent execution in Operating Systems and Edge AI research.",
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
