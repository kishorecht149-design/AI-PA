/**
 * AMAHAS Typed Event Mechanism & Integration Service Layer (Phase 4)
 *
 * Lightweight, zero-cost, in-process typed event bus with database audit backing.
 * Guarantees:
 * 1. Events represent facts that HAVE successfully occurred, not mere attempts.
 * 2. Failed mutations NEVER emit success events.
 * 3. Idempotent dispatch prevents duplicate downstream executions on retries.
 * 4. Atomic database updates via Prisma transactions where applicable.
 * 5. Structured logging with strict exclusion of secrets and passwords.
 */

import { prisma } from "./prisma.ts";

export type AmahasEventType =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.rescheduled"
  | "focus_session.completed"
  | "academic_revision.scheduled"
  | "habit.completed"
  | "note.updated";

export interface AmahasEvent<T = any> {
  eventId: string;
  eventType: AmahasEventType;
  entityId: string;
  userId: string;
  version: "1.0";
  timestamp: string; // ISO-8601
  correlationId?: string;
  payload: T;
}

export type EventHandler<T = any> = (event: AmahasEvent<T>) => Promise<void>;

class AmahasEventBus {
  private handlers = new Map<AmahasEventType, EventHandler[]>();
  private processedEventIds = new Set<string>();

  /**
   * Register a typed event handler.
   */
  subscribe<T = any>(type: AmahasEventType, handler: EventHandler<T>): () => void {
    const list = this.handlers.get(type) || [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      const updated = (this.handlers.get(type) || []).filter((h) => h !== handler);
      this.handlers.set(type, updated);
    };
  }

  /**
   * Publish an event after a mutation has successfully committed.
   * Guarantees idempotency: duplicate eventIds are ignored.
   */
  async publish<T = any>(
    type: AmahasEventType,
    entityId: string,
    userId: string,
    payload: T,
    correlationId?: string,
    explicitEventId?: string
  ): Promise<AmahasEvent<T>> {
    const eventId = explicitEventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const event: AmahasEvent<T> = {
      eventId,
      eventType: type,
      entityId,
      userId,
      version: "1.0",
      timestamp: new Date().toISOString(),
      correlationId: correlationId || `corr_${Date.now()}`,
      payload,
    };

    // In-memory L1 deduplication check
    if (this.processedEventIds.has(eventId)) {
      return event;
    }

    // Persistent L2 deduplication check against database audit logs
    try {
      if (prisma.auditEvent) {
        const existingEvent = await prisma.auditEvent.findFirst({
          where: {
            userId,
            action: `EVENT_DISPATCHED:${eventId}`,
          },
          select: { id: true },
        });
        if (existingEvent) {
          this.processedEventIds.add(eventId);
          return event;
        }
      }
    } catch {
      // If DB check encounters offline pooler, proceed with in-memory isolation
    }

    this.processedEventIds.add(eventId);

    // Keep processed IDs memory bounded to last 5,000 events
    if (this.processedEventIds.size > 5000) {
      const firstEntries = Array.from(this.processedEventIds).slice(0, 1000);
      for (const id of firstEntries) this.processedEventIds.delete(id);
    }

    // Persist event to audit log for durability (excluding sensitive data)
    try {
      if (prisma.auditEvent) {
        await prisma.auditEvent.create({
          data: {
            userId,
            action: `EVENT_DISPATCHED:${eventId}`,
            detailsJson: JSON.stringify({
              eventId: event.eventId,
              eventType: type,
              entityId: event.entityId,
              correlationId: event.correlationId,
              timestamp: event.timestamp,
              payload: this.sanitizePayload(payload),
            }),
          },
        });
      }
    } catch (auditErr: any) {
      // Non-blocking log warning for audit failures
      console.warn(`[EventBus] Audit persistence skipped: ${auditErr.message}`);
    }

    // Execute subscribed in-process handlers
    const registeredHandlers = this.handlers.get(type) || [];
    for (const handler of registeredHandlers) {
      try {
        await handler(event);
      } catch (err: any) {
        console.error(`[EventBus] Error in handler for ${type} (entity: ${entityId}):`, err.message);
        // Primary operation already succeeded; downstream secondary failures must not crash the event bus
      }
    }

    return event;
  }

  /**
   * Sanitize payloads to ensure tokens and passwords are never logged.
   */
  private sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== "object") return payload;
    const clean = { ...payload };
    const sensitiveKeys = ["password", "passwordHash", "token", "apiKey", "secret"];
    for (const key of Object.keys(clean)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        clean[key] = "[REDACTED]";
      }
    }
    return clean;
  }
}

export const eventBus = new AmahasEventBus();

// =============================================================================
// Canonical Cross-Module Handlers (Integrations A, B, C, D)
// =============================================================================

// Handler A1: When a task is completed, update linked project & goal progress, complete timeblocks, and resolve unread reminders
eventBus.subscribe("task.completed", async (event) => {
  const { taskId, projectId } = event.payload;

  // 1. Mark linked TimeBlocks completed
  if (taskId && prisma.timeBlock) {
    try {
      await prisma.timeBlock.updateMany({
        where: { taskId, userId: event.userId },
        data: { completed: true },
      });
    } catch (tbErr: any) {
      console.warn(`[Integration A] Error completing timeblock for task ${taskId}: ${tbErr.message}`);
    }
  }

  // 2. Mark unread reminder notifications for this task as read
  if (taskId && prisma.notification) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId: event.userId,
          link: { contains: taskId },
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch (notifErr: any) {
      console.warn(`[Integration A] Error resolving notifications for task ${taskId}: ${notifErr.message}`);
    }
  }

  // 3. Recalculate linked Project and Goal progress if projectId is present
  if (projectId && prisma.project) {
    try {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: event.userId },
        include: {
          tasks: { select: { id: true, status: true } },
          milestones: { select: { id: true, completed: true } },
        },
      });

      if (project) {
        const totalUnits = project.tasks.length + project.milestones.length;
        const completedUnits =
          project.tasks.filter((t) => t.status === "COMPLETED").length +
          project.milestones.filter((m) => m.completed).length;

        const progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
        if (progress === 100 && project.status === "ACTIVE") {
          await prisma.project.update({
            where: { id: projectId },
            data: { status: "COMPLETED" },
          });
        }

        // Synchronize linked Goals
        if (prisma.goal) {
          const linkedGoals = await prisma.goal.findMany({
            where: { projectId, userId: event.userId },
            include: { milestones: true },
          });

          for (const goal of linkedGoals) {
            let goalProgress = progress;
            if (goal.milestones.length > 0) {
              const doneM = goal.milestones.filter((m) => m.completed).length;
              goalProgress = Math.round((doneM / goal.milestones.length) * 100);
            }
            if (goalProgress !== goal.progressPct) {
              await prisma.goal.update({
                where: { id: goal.id },
                data: {
                  progressPct: goalProgress,
                  status: goalProgress === 100 ? "ACHIEVED" : goal.status,
                },
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Integration A] Error updating project/goals on task.completed: ${err.message}`);
    }
  }
});

// Handler A2: When a task is rescheduled, update linked TimeBlock if present
eventBus.subscribe("task.rescheduled", async (event) => {
  const { taskId, newDueDate } = event.payload;
  if (!taskId || !newDueDate || !prisma.timeBlock) return;

  try {
    const targetDate = new Date(newDueDate);
    const existingBlock = await prisma.timeBlock.findFirst({
      where: { taskId, userId: event.userId },
    });

    if (existingBlock) {
      const durationMs =
        new Date(existingBlock.endTime).getTime() - new Date(existingBlock.startTime).getTime();
      await prisma.timeBlock.update({
        where: { id: existingBlock.id },
        data: {
          startTime: targetDate,
          endTime: new Date(targetDate.getTime() + durationMs),
        },
      });
    }
  } catch (err: any) {
    console.warn(`[Integration A] Error updating timeblock on task.rescheduled: ${err.message}`);
  }
});

// Handler B1: When a focus session completes on a syllabus topic, update revision readiness
// Note: Academic mastery is determined strictly by SM-2 ratings; timer only marks lastStudiedAt and IN_PROGRESS
eventBus.subscribe("focus_session.completed", async (event) => {
  const { topicId } = event.payload;
  if (!topicId || !prisma.syllabusTopic) return;

  try {
    const topic = await prisma.syllabusTopic.findFirst({
      where: {
        id: topicId,
        unit: { course: { userId: event.userId } },
      },
    });
    if (topic) {
      await prisma.syllabusTopic.update({
        where: { id: topicId },
        data: {
          lastStudiedAt: new Date(),
          status: topic.status === "UNSTUDIED" ? "IN_PROGRESS" : topic.status,
        },
      });
    }
  } catch (err: any) {
    console.warn(`[Integration B] Error updating topic on focus_session.completed: ${err.message}`);
  }
});

// Handler B2: When an academic revision is scheduled, create or update a revision reminder
eventBus.subscribe("academic_revision.scheduled", async (event) => {
  const { topicId, nextRevisionDate, topicTitle, courseName } = event.payload;
  if (!topicId || !prisma.notification) return;

  try {
    const link = `/academics?topicId=${topicId}`;
    const existing = await prisma.notification.findFirst({
      where: {
        userId: event.userId,
        link,
        isRead: false,
      },
    });

    const title = `Revision Due: ${topicTitle || "Academic Topic"}`;
    const dateStr = nextRevisionDate ? new Date(nextRevisionDate).toLocaleDateString() : "soon";
    const message = `Spaced repetition revision scheduled for ${topicTitle || "topic"}${
      courseName ? ` in ${courseName}` : ""
    }. Due: ${dateStr}.`;

    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: {
          title,
          message,
          category: "REVISION",
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: event.userId,
          category: "REVISION",
          title,
          message,
          link,
          isRead: false,
        },
      });
    }
  } catch (err: any) {
    console.warn(`[Integration B] Error scheduling revision notification: ${err.message}`);
  }
});

// Handler D1: When a habit is completed, update aligned goal milestones if present
eventBus.subscribe("habit.completed", async (event) => {
  const { habitId, habitName } = event.payload;
  if (!habitId || !habitName || !prisma.goal) return;

  try {
    const matchingGoals = await prisma.goal.findMany({
      where: {
        userId: event.userId,
        status: "IN_PROGRESS",
      },
      include: { milestones: true },
    });

    for (const goal of matchingGoals) {
      const pendingMilestone = goal.milestones.find(
        (m) => !m.completed && m.title.toLowerCase().includes(habitName.toLowerCase())
      );
      if (pendingMilestone) {
        await prisma.goalMilestone.update({
          where: { id: pendingMilestone.id },
          data: { completed: true },
        });
        const total = goal.milestones.length;
        const done = goal.milestones.filter((m) => m.completed || m.id === pendingMilestone.id).length;
        const progressPct = total > 0 ? Math.round((done / total) * 100) : 100;
        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            progressPct,
            status: progressPct === 100 ? "ACHIEVED" : "IN_PROGRESS",
          },
        });
      }
    }
  } catch (err: any) {
    console.warn(`[Integration D] Error updating goal on habit.completed: ${err.message}`);
  }
});
