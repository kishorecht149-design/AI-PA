import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { eventBus } from "@/lib/events";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const todayStr = new Date().toISOString().substring(0, 10);

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        logs: {
          orderBy: { dateString: "desc" },
          take: 14,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enhanced = habits.map((h) => ({
      ...h,
      isCompletedToday: h.logs.some((l) => l.dateString === todayStr && l.completed),
    }));

    return NextResponse.json({ habits: enhanced, todayStr });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. Create a brand new habit
    if (body.action === "CREATE" || (!body.habitId && body.name)) {
      const { name, description, frequency, category } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Habit name is required" }, { status: 400 });
      }

      const habit = await prisma.habit.create({
        data: {
          userId,
          name: name.trim(),
          description: description?.trim() || null,
          frequency: frequency || "DAILY",
          category: category || "growth",
        },
      });

      return NextResponse.json({ success: true, habit }, { status: 201 });
    }

    // 2. Toggle or log existing habit completion
    const { habitId, dateString, completed, reflection } = body;
    if (!habitId) {
      return NextResponse.json({ error: "Habit ID or Habit Name required" }, { status: 400 });
    }

    const todayStr = dateString || new Date().toISOString().substring(0, 10);

    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

    const existingLog = await prisma.habitLog.findUnique({
      where: { habitId_dateString: { habitId, dateString: todayStr } },
    });
    const wasAlreadyCompleted = existingLog?.completed === true;

    const log = await prisma.habitLog.upsert({
      where: {
        habitId_dateString: { habitId, dateString: todayStr },
      },
      update: {
        completed: !!completed,
        reflection: reflection || null,
      },
      create: {
        habitId,
        dateString: todayStr,
        completed: !!completed,
        reflection: reflection || null,
      },
    });

    // Update streak idempotently: only adjust when completion state genuinely changes
    let newStreak = habit.currentStreak;
    if (completed && !wasAlreadyCompleted) {
      newStreak = habit.currentStreak + 1;
    } else if (!completed && wasAlreadyCompleted) {
      newStreak = Math.max(0, habit.currentStreak - 1);
    }

    if (newStreak !== habit.currentStreak) {
      await prisma.habit.update({
        where: { id: habitId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(habit.longestStreak, newStreak),
        },
      });
    }

    if (completed && !wasAlreadyCompleted) {
      eventBus.publish("habit.completed", habitId, userId, {
        habitId,
        habitName: habit.name,
        dateString: todayStr,
      });
    }

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const habitId = searchParams.get("id");
    if (!habitId) return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) {
      return NextResponse.json({ error: "Habit not found or unauthorized" }, { status: 404 });
    }

    await prisma.habitLog.deleteMany({ where: { habitId } });
    await prisma.habit.delete({ where: { id: habitId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
