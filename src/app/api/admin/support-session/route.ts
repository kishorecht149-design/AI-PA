import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  startSupportEditSession,
  assertAdminRole,
  recordAdminAudit,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { adminRole: true },
    });

    assertAdminRole(admin?.adminRole, "any");

    const body = await req.json();
    const { targetUserId, reason } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required." },
        { status: 400 }
      );
    }

    const session = await startSupportEditSession({
      adminId: sessionUser.id,
      targetUserId,
      reason,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt.toISOString(),
      durationMinutes: 15,
      message: "15-minute support edit session started. All actions are recorded in internal audit log.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to start support edit session." },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId } = body;

    await prisma.adminSupportSession.updateMany({
      where: {
        id: sessionId,
        adminId: sessionUser.id,
      },
      data: {
        endedAt: new Date(),
      },
    });

    await recordAdminAudit({
      adminId: sessionUser.id,
      action: "END_SUPPORT_EDIT_SESSION",
      details: { sessionId },
    });

    return NextResponse.json({ success: true, message: "Support session terminated." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to end support session." },
      { status: 500 }
    );
  }
}
