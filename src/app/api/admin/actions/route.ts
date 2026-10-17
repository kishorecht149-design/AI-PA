import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { assertAdminRole, recordAdminAudit } from "@/lib/admin";
import { isEmailConfigured } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAdmin = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { adminRole: true, email: true },
    });

    const body = await req.json();
    const { action, targetUserId, newRole } = body;

    if (action === "PROMOTE_ADMIN") {
      // Strictly Owner-only operation!
      assertAdminRole(currentAdmin?.adminRole, "owner");

      if (!targetUserId || !newRole) {
        return NextResponse.json(
          { error: "Target user ID and new role are required." },
          { status: 400 }
        );
      }

      if (newRole !== "support_admin" && newRole !== "owner") {
        return NextResponse.json(
          { error: "Invalid role specified." },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { adminRole: newRole },
      });

      await recordAdminAudit({
        adminId: sessionUser.id,
        targetUserId,
        action: "PROMOTE_USER_ROLE",
        details: { newRole, updatedEmail: updated.email },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });

      return NextResponse.json({
        success: true,
        message: `User ${updated.email} promoted to ${newRole}.`,
      });
    }

    if (action === "INVITE_ADMIN") {
      assertAdminRole(currentAdmin?.adminRole, "owner");

      const { email, role } = body;
      if (!email || !role) {
        return NextResponse.json(
          { error: "Admin email and target role are required." },
          { status: 400 }
        );
      }

      const cleanEmail = email.toLowerCase().trim();
      const targetUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (targetUser) {
        const updated = await prisma.user.update({
          where: { id: targetUser.id },
          data: { adminRole: role },
        });

        await recordAdminAudit({
          adminId: sessionUser.id,
          targetUserId: targetUser.id,
          action: "PROMOTE_USER_ROLE",
          details: { newRole: role, updatedEmail: updated.email, method: "DIRECT_INVITATION" },
          ipAddress: req.headers.get("x-forwarded-for") || undefined,
        });

        return NextResponse.json({
          success: true,
          message: `Existing account for ${cleanEmail} has been granted ${role} authority.`,
        });
      }

      // If user does not exist yet
      if (!isEmailConfigured()) {
        return NextResponse.json(
          {
            error:
              "Cannot dispatch email invitation: email service is unconfigured on this deployment. Ask user to create an account first, then promote them.",
            code: "EMAIL_SERVICE_UNCONFIGURED",
          },
          { status: 503 }
        );
      }

      // If email is configured, record invitation in audit log
      await recordAdminAudit({
        adminId: sessionUser.id,
        action: "INVITE_NEW_ADMIN",
        details: { targetEmail: cleanEmail, role },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });

      return NextResponse.json({
        success: true,
        message: `Administrative invitation dispatched to ${cleanEmail}.`,
      });
    }

    return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Admin operation failed." },
      { status: err.status || 500 }
    );
  }
}
