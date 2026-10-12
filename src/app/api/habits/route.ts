import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

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
    const { habitId, dateString, completed, reflection } = body;

    const todayStr = dateString || new Date().toISOString().substring(0, 10);

    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

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

    // Update streak
    const newStreak = completed ? habit.currentStreak + 1 : Math.max(0, habit.currentStreak - 1);
    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak),
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
