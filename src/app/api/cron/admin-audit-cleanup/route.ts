import { NextResponse } from "next/server";
import { cleanupExpiredAuditLogs } from "@/lib/admin";

async function handleAuditCleanup(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET must be configured in production to execute scheduled jobs." },
        { status: 401 }
      );
    }

    const result = await cleanupExpiredAuditLogs();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auditCleanup: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to clean up expired audit logs." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleAuditCleanup(req);
}

export async function POST(req: Request) {
  return handleAuditCleanup(req);
}
