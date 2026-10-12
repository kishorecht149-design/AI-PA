import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser, preferences, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      prisma.userPreference.findUnique({ where: { userId } }),
      prisma.profile.findUnique({ where: { userId } }),
    ]);

    return NextResponse.json({
      user: dbUser,
      preferences,
      profile,
    });
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
    const { name, workingHoursStart, workingHoursEnd, preferredFocusMinutes, timeZone } = body;

    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
      });
    }

    const updatedPref = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        ...(workingHoursStart && { workingHoursStart }),
        ...(workingHoursEnd && { workingHoursEnd }),
        ...(preferredFocusMinutes && { preferredFocusMinutes: Number(preferredFocusMinutes) }),
        ...(timeZone && { timeZone }),
      },
      create: {
        userId,
        workingHoursStart: workingHoursStart || "08:30",
        workingHoursEnd: workingHoursEnd || "22:30",
        preferredFocusMinutes: preferredFocusMinutes ? Number(preferredFocusMinutes) : 45,
        timeZone: timeZone || "Asia/Kolkata",
      },
    });

    return NextResponse.json({ success: true, preferences: updatedPref });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
