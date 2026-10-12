import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [
      dbUser,
      tasks,
      projects,
      courses,
      researchProjects,
      notes,
      habits,
      goals,
      reviews,
      memories,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true, preferences: true },
      }),
      prisma.task.findMany({ where: { userId }, include: { subtasks: true } }),
      prisma.project.findMany({ where: { userId }, include: { milestones: true } }),
      prisma.course.findMany({
        where: { userId },
        include: { units: { include: { topics: true } } },
      }),
      prisma.researchProject.findMany({
        where: { userId },
        include: { papers: true, experiments: true, datasets: true },
      }),
      prisma.note.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId }, include: { logs: true } }),
      prisma.goal.findMany({ where: { userId }, include: { milestones: true } }),
      prisma.productivityReview.findMany({ where: { userId } }),
      prisma.aIMemory.findMany({ where: { userId } }),
    ]);

    const exportData = {
      exportVersion: "1.0",
      exportTimestamp: new Date().toISOString(),
      user: dbUser,
      tasks,
      projects,
      courses,
      researchProjects,
      notes,
      habits,
      goals,
      reviews,
      aiMemories: memories,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="amahas_student_export_${new Date().toISOString().substring(0, 10)}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
