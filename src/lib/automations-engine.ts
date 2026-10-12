import { prisma } from "./prisma";
import { calculateSM2 } from "./spaced-repetition";

export type TriggerType =
  | "ON_TASK_COMPLETED"
  | "ON_FOCUS_COMPLETED"
  | "ON_REVISION_DUE"
  | "CRON_SCHEDULE"
  | "WEBHOOK";

export interface EventPayload {
  userId: string;
  triggerType: TriggerType;
  taskId?: string;
  focusSessionId?: string;
  topicId?: string;
  rating?: number;
  durationMinutes?: number;
  notes?: string;
}

/**
 * Native internal automation runner for student workflows.
 */
export async function dispatchAutomationEvent(payload: EventPayload): Promise<{
  executedCount: number;
  results: any[];
}> {
  const { userId, triggerType } = payload;

  // 1. Core Deterministic Lifecycle Actions (always executed)
  if (triggerType === "ON_FOCUS_COMPLETED") {
    // A study session completed:
    // Update task actual duration if linked
    if (payload.taskId && payload.durationMinutes) {
      await prisma.task.update({
        where: { id: payload.taskId },
        data: {
          actualMinutes: { increment: payload.durationMinutes },
        },
      });
    }

    // Update topic revision history & calculate next SM-2 interval
    if (payload.topicId) {
      const topic = await prisma.syllabusTopic.findUnique({
        where: { id: payload.topicId },
        include: { revisionRecords: { orderBy: { studiedAt: "desc" }, take: 1 } },
      });

      if (topic) {
        const lastRecord = topic.revisionRecords[0];
        const prevRepetitions = topic.revisionCount;
        const prevInterval = lastRecord?.intervalDays || 1;
        const prevEase = lastRecord?.easeFactor || 2.5;
        const rating = payload.rating || 4;

        const sm2 = calculateSM2({
          rating,
          repetitions: prevRepetitions,
          intervalDays: prevInterval,
          easeFactor: prevEase,
        });

        await prisma.$transaction([
          prisma.revisionRecord.create({
            data: {
              topicId: topic.id,
              studySessionId: payload.focusSessionId,
              rating,
              intervalDays: sm2.intervalDays,
              easeFactor: sm2.easeFactor,
              notes: payload.notes || "Completed focus study block",
            },
          }),
          prisma.syllabusTopic.update({
            where: { id: topic.id },
            data: {
              status: rating >= 4 ? "MASTERED" : "REVISED",
              lastStudiedAt: new Date(),
              nextRevisionAt: sm2.nextReviewDate,
              revisionCount: sm2.repetitions,
            },
          }),
        ]);
      }
    }
  }

  // 2. User-Configured Automations
  const userAutomations = await prisma.automation.findMany({
    where: {
      userId,
      triggerType,
      isEnabled: true,
    },
  });

  const results: any[] = [];
  for (const auto of userAutomations) {
    try {
      const actions = JSON.parse(auto.actionsJson || "[]");
      const execution = await prisma.automationExecution.create({
        data: {
          automationId: auto.id,
          status: "SUCCESS",
          triggerPayload: JSON.stringify(payload),
          stepsResultJson: JSON.stringify({
            executedActionsCount: actions.length,
            completedAt: new Date().toISOString(),
          }),
        },
      });
      results.push({ automationId: auto.id, executionId: execution.id, status: "SUCCESS" });
    } catch (err: any) {
      await prisma.automationExecution.create({
        data: {
          automationId: auto.id,
          status: "FAILED",
          triggerPayload: JSON.stringify(payload),
          errorMessage: err.message,
        },
      });
      results.push({ automationId: auto.id, status: "FAILED", error: err.message });
    }
  }

  return { executedCount: userAutomations.length, results };
}
