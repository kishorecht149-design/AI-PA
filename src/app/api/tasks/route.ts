import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    // Default to the seeded student user if not authenticated in development
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true, color: true } },
        course: { select: { id: true, code: true, name: true } },
        researchProject: { select: { id: true, title: true } },
        subtasks: true,
      },
    });

    return NextResponse.json({ tasks });
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
    const { title, description, priority, dueDate, estimatedMinutes, courseId, projectId, researchProjectId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        courseId: courseId || null,
        projectId: projectId || null,
        researchProjectId: researchProjectId || null,
      },
      include: {
        project: true,
        course: true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, status, actualMinutes, priority, title, dueDate } = body;

    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(status && {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        }),
        ...(typeof actualMinutes === "number" && { actualMinutes }),
        ...(priority && { priority }),
        ...(title && { title: title.trim() }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });

    return NextResponse.json({ task: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.task.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
