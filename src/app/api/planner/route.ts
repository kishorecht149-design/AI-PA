import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

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
        take: 10,
        orderBy: { priority: "desc" },
      }),
    ]);

    // Conflict detection engine: check for overlapping fixed blocks
    const conflicts: { blockA: string; blockB: string; time: string }[] = [];
    for (let i = 0; i < timeBlocks.length; i++) {
      for (let j = i + 1; j < timeBlocks.length; j++) {
        const a = timeBlocks[i];
        const b = timeBlocks[j];
        if (new Date(a.startTime) < new Date(b.endTime) && new Date(a.endTime) > new Date(b.startTime)) {
          conflicts.push({
            blockA: a.title,
            blockB: b.title,
            time: `${new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(a.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
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

    const block = await prisma.timeBlock.create({
      data: {
        userId,
        title: title || "Focus Block",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        category: category || "focus",
        taskId: taskId || null,
        isFixed: !!isFixed,
      },
    });

    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { scheduledDate: new Date(startTime) },
      });
    }

    return NextResponse.json({ block }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
