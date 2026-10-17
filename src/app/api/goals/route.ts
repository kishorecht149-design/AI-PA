import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { assertWorkspaceWriteAccess } from "@/lib/subscription";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        milestones: { orderBy: { createdAt: "asc" } },
        project: { select: { name: true } },
      },
      orderBy: { targetDate: "asc" },
    });

    return NextResponse.json({ goals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const { title, objective, category, targetDate, milestones, projectId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Goal title is required" }, { status: 400 });
    }

    const milestoneData = Array.isArray(milestones)
      ? milestones
          .filter((m: any) => typeof m === "string" ? m.trim().length > 0 : m.title?.trim().length > 0)
          .map((m: any) => ({
            title: typeof m === "string" ? m.trim() : m.title.trim(),
            completed: false,
          }))
      : [];

    const goal = await prisma.goal.create({
      data: {
        userId,
        title: title.trim(),
        objective: objective?.trim() || null,
        category: category || "academics",
        targetDate: targetDate ? new Date(targetDate) : null,
        projectId: projectId || null,
        progressPct: 0,
        isDemo: false,
        milestones: {
          create: milestoneData,
        },
      },
      include: {
        milestones: true,
        project: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, goal }, { status: 201 });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const { milestoneId, completed, goalId, title, objective, status } = body;

    // 1. If toggling milestone completion:
    if (milestoneId) {
      const milestone = await prisma.goalMilestone.findUnique({
        where: { id: milestoneId },
        include: { goal: true },
      });

      if (!milestone || milestone.goal.userId !== userId) {
        return NextResponse.json({ error: "Milestone not found or unauthorized" }, { status: 404 });
      }

      // Update milestone
      await prisma.goalMilestone.update({
        where: { id: milestoneId },
        data: {
          completed: !!completed,
        },
      });

      // Recalculate parent goal progress %
      const allMilestones = await prisma.goalMilestone.findMany({
        where: { goalId: milestone.goalId },
      });

      const total = allMilestones.length;
      const done = allMilestones.filter((m) => m.completed).length;
      const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
      const nextStatus = progressPct === 100 ? "ACHIEVED" : done > 0 ? "IN_PROGRESS" : milestone.goal.status;

      const updatedGoal = await prisma.goal.update({
        where: { id: milestone.goalId },
        data: {
          progressPct,
          status: nextStatus,
        },
        include: {
          milestones: true,
          project: { select: { name: true } },
        },
      });

      return NextResponse.json({
        success: true,
        goal: updatedGoal,
        progressPct,
        milestonesCompleted: done,
        milestonesTotal: total,
      });
    }

    // 2. If updating goal attributes directly:
    if (goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

      const updated = await prisma.goal.update({
        where: { id: goalId },
        data: {
          ...(title && { title: title.trim() }),
          ...(objective !== undefined && { objective: objective?.trim() || null }),
          ...(status && { status }),
        },
        include: {
          milestones: true,
          project: { select: { name: true } },
        },
      });

      return NextResponse.json({ success: true, goal: updated });
    }

    return NextResponse.json({ error: "Provide milestoneId or goalId" }, { status: 400 });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.goal.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
