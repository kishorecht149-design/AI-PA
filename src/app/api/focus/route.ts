import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { triggerAutomations } from "@/lib/automations-engine";

export async function GET(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
      take: 50,
      include: {
        task: { select: { id: true, title: true, priority: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.actualMinutes, 0);

    return NextResponse.json({
      sessions,
      totalSessions: sessions.length,
      totalMinutes,
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
    const {
      taskId,
      courseId,
      topicId,
      targetMinutes,
      actualMinutes,
      reflectionNotes,
      energyRating,
      distractionCount,
    } = body;

    const actual = Math.max(1, Number(actualMinutes) || 1);
    const target = Number(targetMinutes) || actual;
    const now = new Date();
    const start = new Date(now.getTime() - actual * 60000);

    // 1. Create persistent FocusSession record
    const session = await prisma.focusSession.create({
      data: {
        userId,
        taskId: taskId || null,
        courseId: courseId || null,
        topicId: topicId || null,
        targetMinutes: target,
        actualMinutes: actual,
        startTime: start,
        endTime: now,
        completed: true,
        reflectionNotes: reflectionNotes || null,
        energyRating: energyRating ? Number(energyRating) : 4,
        distractionCount: distractionCount ? Number(distractionCount) : 0,
      },
    });

    // 2. If linked to a task, update task's actual minutes and mark in-progress if TODO
    let updatedTask = null;
    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
      if (task) {
        updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            actualMinutes: task.actualMinutes + actual,
            status: task.status === "TODO" ? "IN_PROGRESS" : task.status,
          },
        });
      }
    }

    // 3. Trigger workflow automations engine for ON_FOCUS_COMPLETED
    try {
      await triggerAutomations("ON_FOCUS_COMPLETED", {
        userId,
        focusSessionId: session.id,
        durationMinutes: actual,
        taskId: taskId || undefined,
        courseId: courseId || undefined,
      });
    } catch (autoErr) {
      console.warn("Automation trigger warning:", autoErr);
    }

    return NextResponse.json(
      {
        success: true,
        session,
        updatedTask,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
