import { NextResponse } from "next/server";
import { runRetentionCleanup } from "@/lib/subscription";
import { cleanupExpiredAuditLogs } from "@/lib/admin";
import { cleanupExpiredEmailTokens } from "@/lib/email-verification";
import { runPaymentWebhookRetention } from "@/lib/webhook-idempotency";

async function handleRetentionCleanup(req: Request) {
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

    // 1. Run 30-day user workspace retention cleanup
    const retentionResult = await runRetentionCleanup();

    // 2. Clean up expired email verification tokens
    const emailTokenResult = await cleanupExpiredEmailTokens();

    // 3. Run safe payment webhook retention (sanitizes diagnostic/personal data, preserves unique replay tombstone)
    const webhookRetentionResult = await runPaymentWebhookRetention();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      retentionCleanup: retentionResult,
      expiredEmailTokensCleaned: emailTokenResult.deletedCount,
      paymentWebhookRetention: webhookRetentionResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cron cleanup failed." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleRetentionCleanup(req);
}

export async function POST(req: Request) {
  return handleRetentionCleanup(req);
}
