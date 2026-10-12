import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { triggerAutomations } from "@/lib/automations-engine";

export async function GET(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 86400000);

    const [events, timeBlocks, unscheduledTasks] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: { gte: startOfDay, lte: endOfWeek },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.timeBlock.findMany({
        where: {
          userId,
          startTime: { gte: startOfDay, lte: endOfWeek },
        },
        orderBy: { startTime: "asc" },
        include: { task: true },
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: "TODO",
          scheduledDate: null,
        },
        take: 15,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    // Conflict detection engine: check for overlapping blocks
    const conflicts: { blockA: string; blockB: string; time: string; severity: "WARNING" | "CRITICAL" }[] = [];
    for (let i = 0; i < timeBlocks.length; i++) {
      for (let j = i + 1; j < timeBlocks.length; j++) {
        const a = timeBlocks[i];
        const b = timeBlocks[j];
        if (new Date(a.startTime) < new Date(b.endTime) && new Date(a.endTime) > new Date(b.startTime)) {
          conflicts.push({
            blockA: a.title,
            blockB: b.title,
            time: `${new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(a.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            severity: a.isFixed || b.isFixed ? "CRITICAL" : "WARNING",
          });
        }
      }
    }

    return NextResponse.json({
      events,
      timeBlocks,
      unscheduledTasks,
      conflicts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, startTime, endTime, category, taskId, isFixed } = body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check for conflict against existing blocks
    const overlapping = await prisma.timeBlock.findFirst({
      where: {
        userId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    const block = await prisma.timeBlock.create({
      data: {
        userId,
        title: title || "Focus Block",
        startTime: start,
        endTime: end,
        category: category || "focus",
        taskId: taskId || null,
        isFixed: !!isFixed,
      },
      include: { task: true },
    });

    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          scheduledDate: start,
          status: "IN_PROGRESS",
        },
      });
    }

    return NextResponse.json(
      {
        block,
        hasConflict: !!overlapping,
        conflictingWith: overlapping?.title || null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { blockId, completed, title, startTime, endTime } = body;

    if (!blockId) return NextResponse.json({ error: "blockId required" }, { status: 400 });

    const existing = await prisma.timeBlock.findFirst({
      where: { id: blockId, userId },
      include: { task: true },
    });
    if (!existing) return NextResponse.json({ error: "Block not found" }, { status: 404 });

    const updated = await prisma.timeBlock.update({
      where: { id: blockId },
      data: {
        ...(completed !== undefined && { completed: !!completed }),
        ...(title && { title: title.trim() }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
      include: { task: true },
    });

    // If block is linked to a task and marked completed:
    if (completed && existing.taskId) {
      const durationMin = Math.round(
        (new Date(existing.endTime).getTime() - new Date(existing.startTime).getTime()) / 60000
      );

      await prisma.task.update({
        where: { id: existing.taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualMinutes: (existing.task?.actualMinutes || 0) + Math.max(0, durationMin),
        },
      });

      try {
        await triggerAutomations("ON_TASK_COMPLETED", {
          userId,
          taskId: existing.taskId,
          durationMinutes: durationMin,
        });
      } catch (autoErr) {
        console.warn("Automation trigger warning:", autoErr);
      }
    }

    return NextResponse.json({ success: true, block: updated });
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
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const block = await prisma.timeBlock.findFirst({
      where: { id, userId },
    });

    if (block) {
      // If linked to a task, return task to unscheduled state
      if (block.taskId) {
        await prisma.task.update({
          where: { id: block.taskId },
          data: { scheduledDate: null },
        });
      }

      await prisma.timeBlock.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
