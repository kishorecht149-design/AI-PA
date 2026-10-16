/**
 * AMAHAS Zero-Cost Database-Backed Transactional Outbox (Sprint 1.1 Final Patch)
 *
 * Implements durable at-least-once event delivery using the existing PostgreSQL
 * AuditEvent schema without requiring third-party message queues or destructive migrations.
 *
 * Guarantees:
 * 1. Atomicity: Primary mutation and outbox record commit in the same Prisma transaction.
 * 2. Concurrency Safety: Atomic conditional locking (optimistic concurrency control via updateMany)
 *    ensures competing workers/dispatchers never process the same outbox row concurrently.
 * 3. Bounded Retries: Failed handler executions retry up to 3 times before transitioning to FAILED.
 * 4. Idempotency: Handlers execute with persistent deduplication.
 */

import { prisma } from "./prisma.ts";
import { eventBus, type AmahasEventType, type AmahasEvent } from "./events.ts";

export interface OutboxPayload<T = any> {
  eventId: string;
  eventType: AmahasEventType;
  entityId: string;
  userId: string;
  payload: T;
  correlationId?: string;
  attempts: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  lastError?: string;
  createdAt: string;
}

/**
 * Creates an outbox audit record definition suitable for inclusion in a Prisma $transaction.
 */
export function createOutboxEventOperation(params: {
  eventType: AmahasEventType;
  entityId: string;
  userId: string;
  payload: any;
  correlationId?: string;
  eventId?: string;
}) {
  const { eventType, entityId, userId, payload, correlationId } = params;
  const eventId = params.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const outboxData: OutboxPayload = {
    eventId,
    eventType,
    entityId,
    userId,
    payload,
    correlationId: correlationId || `corr_${Date.now()}`,
    attempts: 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  return {
    eventId,
    createData: {
      userId,
      action: `OUTBOX:PENDING:${eventType}`,
      detailsJson: JSON.stringify(outboxData),
    },
  };
}

/**
 * Drain pending outbox events using atomic conditional locking.
 * Safe under concurrent serverless executions without relying on in-memory locks.
 */
export async function drainOutboxEvents(limit = 10): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  try {
    if (!prisma.auditEvent) return { processed: 0, failed: 0 };

    // 1. Fetch pending outbox records
    const pendingRows = await prisma.auditEvent.findMany({
      where: {
        action: { startsWith: "OUTBOX:PENDING:" },
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    for (const row of pendingRows) {
      if (!row.detailsJson) continue;

      let outboxItem: OutboxPayload;
      try {
        outboxItem = JSON.parse(row.detailsJson);
      } catch {
        continue;
      }

      // 2. ATOMIC CLAIM: Use conditional update to lock row across concurrent workers
      // If another concurrent request already claimed this row, count will be 0.
      const claimResult = await prisma.auditEvent.updateMany({
        where: {
          id: row.id,
          action: row.action, // Optimistic concurrency lock
        },
        data: {
          action: `OUTBOX:PROCESSING:${row.id}`,
        },
      });

      if (claimResult.count === 0) {
        // Concurrently claimed by another worker; skip
        continue;
      }

      // 3. Dispatch to internal handlers
      try {
        const syntheticEvent: AmahasEvent = {
          eventId: outboxItem.eventId,
          eventType: outboxItem.eventType,
          entityId: outboxItem.entityId,
          userId: outboxItem.userId,
          version: "1.0",
          timestamp: outboxItem.createdAt,
          correlationId: outboxItem.correlationId,
          payload: outboxItem.payload,
        };

        // Dispatch through event bus handlers with explicit event ID for deduplication
        await eventBus.publish(
          outboxItem.eventType,
          outboxItem.entityId,
          outboxItem.userId,
          outboxItem.payload,
          outboxItem.correlationId,
          outboxItem.eventId
        );

        // 4. Mark COMPLETED
        await prisma.auditEvent.update({
          where: { id: row.id },
          data: {
            action: `OUTBOX:COMPLETED:${row.id}`,
            detailsJson: JSON.stringify({
              ...outboxItem,
              status: "COMPLETED",
              processedAt: new Date().toISOString(),
            }),
          },
        });

        processed++;
      } catch (err: any) {
        failed++;
        const nextAttempts = (outboxItem.attempts || 0) + 1;
        const isDeadLetter = nextAttempts >= 3;

        await prisma.auditEvent.update({
          where: { id: row.id },
          data: {
            action: isDeadLetter ? `OUTBOX:FAILED:${row.id}` : `OUTBOX:PENDING:${outboxItem.eventType}`,
            detailsJson: JSON.stringify({
              ...outboxItem,
              attempts: nextAttempts,
              status: isDeadLetter ? "FAILED" : "PENDING",
              lastError: err.message,
              lastAttemptAt: new Date().toISOString(),
            }),
          },
        });
      }
    }
  } catch (err: any) {
    console.warn(`[Outbox] Drain skipped (database unavailable or offline): ${err.message}`);
  }

  return { processed, failed };
}
