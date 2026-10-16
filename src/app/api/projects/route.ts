import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        milestones: true,
        tasks: { select: { id: true, title: true, status: true, priority: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const enhanced = projects.map((p) => {
      const taskCount = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
      const milestoneCount = p.milestones ? p.milestones.length : 0;
      const completedMilestones = p.milestones ? p.milestones.filter((m: any) => m.completed).length : 0;

      const totalUnits = taskCount + milestoneCount;
      const completedUnits = completedTasks + completedMilestones;
      const progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
      return {
        ...p,
        totalTasks: taskCount,
        completedTasks,
        totalMilestones: milestoneCount,
        completedMilestones,
        calculatedProgress: progress,
      };
    });

    return NextResponse.json({ projects: enhanced });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, objective, category, priority, color } = body;

    const project = await prisma.project.create({
      data: {
        userId,
        name: name.trim(),
        objective: objective?.trim() || null,
        category: category || "general",
        priority: priority || "MEDIUM",
        color: color || "#00e5ff",
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

    await prisma.project.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

