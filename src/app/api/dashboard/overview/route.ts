import { NextResponse } from "next/server";
import { resolveApiUserId } from "@/lib/auth";
import { evaluateDashboardOverview, updateDashboardLayout } from "@/lib/dashboard-evaluator";
import { assertWorkspaceWriteAccess } from "@/lib/subscription";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await evaluateDashboardOverview(userId);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("[Dashboard Overview API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load dashboard overview" },
      { status: err.message === "User not found" ? 404 : 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const updatedLayout = await updateDashboardLayout(userId, body);

    return NextResponse.json({
      success: true,
      layout: updatedLayout,
      message: "Dashboard layout and preferences saved successfully.",
    });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    console.error("[Dashboard Layout API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save dashboard layout" },
      { status: 500 }
    );
  }
}
