import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
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
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        ...p,
        totalTasks,
        completedTasks,
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
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
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
