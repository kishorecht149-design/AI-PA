import { NextResponse } from "next/server";
import { resolveApiUserId, assertWorkspaceWriteAccess } from "@/lib/auth";
import { activateOrUpdateEsePlan, getEseOverview } from "@/lib/ese/service";
import { generate600DayPlan } from "@/lib/ese/schedule-generator";

export async function GET(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");

    if (startDate) {
      // Preview generated plan without activation
      const preview = generate600DayPlan(startDate);
      return NextResponse.json({ preview });
    }

    const overview = await getEseOverview(userId);
    return NextResponse.json(overview);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch plan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const { startDate, previewOnly } = body;

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { error: "Valid start date (YYYY-MM-DD) is required." },
        { status: 400 }
      );
    }

    if (previewOnly) {
      const plan = generate600DayPlan(startDate);
      return NextResponse.json({ plan });
    }

    const result = await activateOrUpdateEsePlan(userId, startDate);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to activate plan" }, { status: 500 });
  }
}
