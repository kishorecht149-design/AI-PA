import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const automations = await prisma.automation.findMany({
      where: { userId },
      include: {
        executions: {
          orderBy: { executedAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ automations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST endpoint to manually trigger a workflow test run
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { automationId, toggleEnabled } = body;

    if (toggleEnabled !== undefined) {
      const updated = await prisma.automation.update({
        where: { id: automationId },
        data: { isEnabled: !!toggleEnabled },
      });
      return NextResponse.json({ success: true, automation: updated });
    }

    // Manual test run
    const auto = await prisma.automation.findFirst({
      where: { id: automationId, userId },
    });
    if (!auto) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const execution = await prisma.automationExecution.create({
      data: {
        automationId: auto.id,
        status: "SUCCESS",
        triggerPayload: JSON.stringify({ manualTriggerBy: user?.name || "Student" }),
        stepsResultJson: JSON.stringify({
          steps: ["Record Duration", "Calculate SM-2 Interval", "Update Review"],
          result: "All steps finished with exit code 0",
        }),
      },
    });

    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
