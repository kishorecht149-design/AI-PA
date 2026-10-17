import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { assertAdminRole, recordAdminAudit } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId") || searchParams.get("targetUserId");

    // Case 1: View individual user workspace & private records
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          phoneVerified: true,
          emailVerified: true,
          adminRole: true,
          createdAt: true,
          subscription: true,
          profile: true,
          _count: {
            select: {
              tasks: true,
              notes: true,
              projects: true,
              courses: true,
              goals: true,
              habits: true,
            },
          },
        },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }

      // Log internal admin view-only workspace access
      await recordAdminAudit({
        adminId: sessionUser.id,
        targetUserId: targetUser.id,
        action: "ADMIN_VIEW_USER_WORKSPACE",
        details: {
          targetEmail: targetUser.email,
          recordsSummary: targetUser._count,
          viewedAt: new Date().toISOString(),
        },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });

      return NextResponse.json({ user: targetUser });
    }

    // Case 2: List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        phoneVerified: true,
        emailVerified: true,
        adminRole: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            billingCycle: true,
            trialStartedAt: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
            retentionDeadline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Record view-only administrative access in internal audit log
    await recordAdminAudit({
      adminId: sessionUser.id,
      action: "ADMIN_VIEW_USER_LIST",
      details: { recordCount: users.length },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch admin users data." },
      { status: err.status || 500 }
    );
  }
}
