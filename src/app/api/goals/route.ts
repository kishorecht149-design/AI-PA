import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        milestones: true,
        project: { select: { name: true } },
      },
      orderBy: { targetDate: "asc" },
    });

    return NextResponse.json({ goals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
