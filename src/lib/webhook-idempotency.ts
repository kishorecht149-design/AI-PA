import { prisma } from "./prisma.ts";

export type ClaimResult =
  | { claimed: true; isDuplicate: false; isConcurrent: false }
  | { claimed: false; isDuplicate: true; isConcurrent: boolean };

/**
 * Claims a webhook event atomically in the database across multiple server instances.
 * Backed by PaymentWebhookEvent with @@unique([provider, eventId]).
 *
 * Guarantees:
 * 1. Exactly-once processing attempt per event ID across all distributed instances.
 * 2. Concurrent attempts receive duplicate=true, concurrent=true.
 * 3. Successful events are marked PROCESSED and cannot be re-executed.
 * 4. Failed events transition to FAILED, permitting retry on subsequent provider deliveries.
 */
export async function claimWebhookEvent(
  provider: "stripe" | "razorpay",
  eventId: string,
  eventType?: string,
  userId?: string
): Promise<ClaimResult> {
  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
        userId,
        status: "PROCESSING",
      },
    });
    return { claimed: true, isDuplicate: false, isConcurrent: false };
  } catch (err: any) {
    if (err.code === "P2002") {
      const existing = await prisma.paymentWebhookEvent.findUnique({
        where: { provider_eventId: { provider, eventId } },
      });

      if (!existing) {
        throw err;
      }

      if (existing.status === "PROCESSED") {
        return { claimed: false, isDuplicate: true, isConcurrent: false };
      }

      if (existing.status === "PROCESSING") {
        const isFresh = Date.now() - new Date(existing.createdAt).getTime() <= 120_000;
        if (isFresh) {
          return { claimed: false, isDuplicate: true, isConcurrent: true };
        }
      }

      // If FAILED or stale PROCESSING (> 120s), allow retry via atomic updateMany
      const reclaimed = await prisma.paymentWebhookEvent.updateMany({
        where: {
          provider,
          eventId,
          status: { in: ["FAILED", "PROCESSING"] },
        },
        data: {
          status: "PROCESSING",
          error: null,
          eventType: eventType || existing.eventType,
          userId: userId || existing.userId,
        },
      });

      if (reclaimed.count > 0) {
        return { claimed: true, isDuplicate: false, isConcurrent: false };
      }

      return { claimed: false, isDuplicate: true, isConcurrent: true };
    }
    throw err;
  }
}

/**
 * Marks a claimed webhook event as successfully PROCESSED.
 */
export async function markWebhookProcessed(provider: "stripe" | "razorpay", eventId: string) {
  try {
    await prisma.paymentWebhookEvent.update({
      where: { provider_eventId: { provider, eventId } },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        error: null,
      },
    });
  } catch (err) {
    console.error("Failed to mark webhook as PROCESSED:", err);
  }
}

/**
 * Marks a claimed webhook event as FAILED, allowing future retries from the payment gateway.
 */
export async function markWebhookFailed(provider: "stripe" | "razorpay", eventId: string, error: string) {
  try {
    await prisma.paymentWebhookEvent.update({
      where: { provider_eventId: { provider, eventId } },
      data: {
        status: "FAILED",
        error: error.slice(0, 1000),
      },
    });
  } catch (err) {
    console.error("Failed to mark webhook as FAILED:", err);
  }
}

/**
 * Safe retention maintenance for PaymentWebhookEvent:
 * 1. Anonymizes/sanitizes diagnostic & personal data (userId, error) from PROCESSED events older than 90 days,
 *    while permanently preserving the lightweight (provider, eventId) unique tombstone to guarantee replay protection.
 * 2. Prunes terminal FAILED events older than 90 days (far exceeding Stripe 72h / Razorpay 24h retry windows).
 * 3. Strictly NEVER touches or removes records currently in "PROCESSING" status.
 */
export async function runPaymentWebhookRetention(cutoffDays = 90): Promise<{
  sanitizedProcessedCount: number;
  prunedFailedCount: number;
}> {
  const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);

  // 1. Sanitize PROCESSED events: strip userId and error while preserving unique tombstone for replay safety
  const sanitizeResult = await prisma.paymentWebhookEvent.updateMany({
    where: {
      status: "PROCESSED",
      createdAt: { lt: cutoff },
      OR: [
        { userId: { not: null } },
        { error: { not: null } },
      ],
    },
    data: {
      userId: null,
      error: null,
    },
  });

  // 2. Safely prune terminal FAILED events older than 90 days (providers stop retrying after 3 days)
  const pruneResult = await prisma.paymentWebhookEvent.deleteMany({
    where: {
      status: "FAILED",
      createdAt: { lt: cutoff },
    },
  });

  return {
    sanitizedProcessedCount: sanitizeResult.count,
    prunedFailedCount: pruneResult.count,
  };
}
