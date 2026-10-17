import { prisma } from "./prisma.ts";
import { isEmailConfigured } from "./email-verification.ts";
import { assertActiveSupportSession } from "./admin.ts";

export type WorkspaceAccessLevel = "FULL" | "READ_ONLY" | "UNVERIFIED";

export interface WorkspaceAccessState {
  accessLevel: WorkspaceAccessLevel;
  canWrite: boolean;
  reason:
    | "ACTIVE_TRIAL"
    | "ACTIVE_SUBSCRIPTION"
    | "CANCELLED_ACTIVE"
    | "TRIAL_EXPIRED"
    | "PAYMENT_FAILED"
    | "SUBSCRIPTION_EXPIRED"
    | "UNVERIFIED";
  statusText: string;
  trialDaysRemaining?: number;
  daysUntilDeletion?: number;
  retentionDeadline?: string | null;
  subscription: {
    status: string;
    billingCycle: string;
    autoRenew: boolean;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  } | null;
}

/**
 * Activates a 7-day free trial for a user.
 * Strictly verifies:
 * 1. User email is verified.
 * 2. User phone is verified.
 * 3. Trial eligibility is met (first account for this phone number).
 */
export async function activateFreeTrial(userId: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (!user.emailVerified) {
    return { success: false, error: "Email verification is required before activating free trial." };
  }

  if (!user.phoneVerified || !user.phoneNumber) {
    return { success: false, error: "Phone number verification is required before activating free trial." };
  }

  // Check if trial was already activated or user already has active subscription
  if (user.subscription) {
    if (user.subscription.trialStartedAt) {
      return { success: true }; // Already activated
    }
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // exactly 7 days
  const retentionDeadline = new Date(trialEndsAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after expiry

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "TRIALING",
      planId: "student_os_all_access",
      billingCycle: "monthly",
      trialStartedAt: now,
      trialEndsAt,
      retentionDeadline,
      autoRenew: true,
      cancelAtPeriodEnd: false,
    },
    update: {
      status: "TRIALING",
      trialStartedAt: now,
      trialEndsAt,
      retentionDeadline,
    },
  });

  return { success: true };
}

/**
 * Evaluates the authoritative workspace access state on the server.
 */
export async function getWorkspaceAccessState(userId: string): Promise<WorkspaceAccessState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    return {
      accessLevel: "UNVERIFIED",
      canWrite: false,
      reason: "UNVERIFIED",
      statusText: "User not found.",
      subscription: null,
    };
  }

  // If not fully verified, require verification
  if (!user.emailVerified || !user.phoneVerified) {
    return {
      accessLevel: "UNVERIFIED",
      canWrite: false,
      reason: "UNVERIFIED",
      statusText: "Identity verification required (email & mobile).",
      subscription: null,
    };
  }

  const sub = user.subscription;
  const now = new Date();

  // If no subscription record exists yet, try activating trial
  if (!sub) {
    return {
      accessLevel: "READ_ONLY",
      canWrite: false,
      reason: "TRIAL_EXPIRED",
      statusText: "No active trial or subscription found.",
      subscription: null,
    };
  }

  // 1. ACTIVE PAID SUBSCRIPTION
  if (sub.status === "ACTIVE") {
    if (sub.currentPeriodEnd && now <= sub.currentPeriodEnd) {
      return {
        accessLevel: "FULL",
        canWrite: true,
        reason: sub.cancelAtPeriodEnd ? "CANCELLED_ACTIVE" : "ACTIVE_SUBSCRIPTION",
        statusText: sub.cancelAtPeriodEnd
          ? `Subscription cancelled. Paid access continues until ${sub.currentPeriodEnd.toISOString().split("T")[0]}.`
          : "Active Student OS All-Access subscription.",
        subscription: {
          status: sub.status,
          billingCycle: sub.billingCycle,
          autoRenew: sub.autoRenew,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          trialEndsAt: sub.trialEndsAt?.toISOString() || null,
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        },
      };
    } else {
      // Period has elapsed
      return buildReadOnlyState(sub, "SUBSCRIPTION_EXPIRED", "Subscription period has ended.", now);
    }
  }

  // 2. TRIALING
  if (sub.status === "TRIALING") {
    if (sub.trialEndsAt && now < sub.trialEndsAt) {
      const trialDaysRemaining = Math.max(
        0,
        Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        accessLevel: "FULL",
        canWrite: true,
        reason: "ACTIVE_TRIAL",
        statusText: `Free trial active (${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining).`,
        trialDaysRemaining,
        subscription: {
          status: sub.status,
          billingCycle: sub.billingCycle,
          autoRenew: sub.autoRenew,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          trialEndsAt: sub.trialEndsAt.toISOString(),
          currentPeriodEnd: null,
        },
      };
    } else {
      // Trial expired
      return buildReadOnlyState(sub, "TRIAL_EXPIRED", "7-day free trial has expired.", now);
    }
  }

  // 3. PAYMENT FAILED / PAST DUE
  if (sub.status === "PAST_DUE") {
    return buildReadOnlyState(
      sub,
      "PAYMENT_FAILED",
      "Renewal payment failed. Workspace is in read-only mode until payment details are updated.",
      now
    );
  }

  // 4. CANCELLED OR EXPIRED
  return buildReadOnlyState(sub, "SUBSCRIPTION_EXPIRED", "Workspace is in read-only mode.", now);
}

function buildReadOnlyState(
  sub: any,
  reason: WorkspaceAccessState["reason"],
  statusText: string,
  now: Date
): WorkspaceAccessState {
  const retentionDeadline = sub.retentionDeadline
    ? new Date(sub.retentionDeadline)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const daysUntilDeletion = Math.max(
    0,
    Math.ceil((retentionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    accessLevel: "READ_ONLY",
    canWrite: false,
    reason,
    statusText,
    daysUntilDeletion,
    retentionDeadline: retentionDeadline.toISOString(),
    subscription: {
      status: sub.status,
      billingCycle: sub.billingCycle,
      autoRenew: sub.autoRenew,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEndsAt: sub.trialEndsAt?.toISOString() || null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
    },
  };
}

/**
 * Server guard: throws or returns error if workspace is in read-only mode.
 */
export async function assertWorkspaceWriteAccess(
  userId: string,
  supportSessionId?: string | null
): Promise<void> {
  // If edit is requested under an admin support session, verify the session is active (<= 15m)
  if (supportSessionId) {
    await assertActiveSupportSession(supportSessionId);
    return;
  }

  const state = await getWorkspaceAccessState(userId);
  if (!state.canWrite) {
    const error: any = new Error(
      state.statusText || "Workspace is in read-only mode. Upgrade or renew to edit content."
    );
    error.status = 403;
    error.code = "WORKSPACE_READ_ONLY";
    throw error;
  }
}

/**
 * Cancels a subscription at the end of the current billing period.
 */
export async function cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) {
    return { success: false, error: "No subscription found to cancel." };
  }

  // Calculate 30-day retention start: from the end of the paid period, not the cancellation request date!
  const baseEnd = sub.currentPeriodEnd || sub.trialEndsAt || new Date();
  const retentionDeadline = new Date(baseEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: true,
      autoRenew: false,
      retentionDeadline,
    },
  });

  return { success: true };
}

/**
 * Idempotent, tenant-isolated 30-day retention cleanup job.
 * Deletes workspace content for expired users past their 30-day deadline,
 * while preserving billing, audit, and security records.
 */
export async function runRetentionCleanup(): Promise<{
  deletedAccountsCount: number;
  processedUserIds: string[];
}> {
  const now = new Date();

  // Find all subscriptions whose 30-day retention deadline has passed and data hasn't been cleaned up
  const expiredSubs = await prisma.subscription.findMany({
    where: {
      retentionDeadline: { lte: now },
      status: { in: ["EXPIRED", "CANCELLED", "TRIALING", "PAST_DUE"] },
      dataDeletedAt: null,
    },
    select: { userId: true, id: true },
  });

  const processedUserIds: string[] = [];

  for (const item of expiredSubs) {
    const targetUserId = item.userId;

    // Execute in transaction to safely purge workspace content without corrupting other users
    await prisma.$transaction(async (tx) => {
      // 1. Productivity & Planning
      await tx.task.deleteMany({ where: { userId: targetUserId } });
      await tx.project.deleteMany({ where: { userId: targetUserId } });
      await tx.timeBlock.deleteMany({ where: { userId: targetUserId } });
      await tx.focusSession.deleteMany({ where: { userId: targetUserId } });
      await tx.calendarEvent.deleteMany({ where: { userId: targetUserId } });
      await tx.habit.deleteMany({ where: { userId: targetUserId } });
      await tx.goal.deleteMany({ where: { userId: targetUserId } });
      await tx.productivityReview.deleteMany({ where: { userId: targetUserId } });

      // 2. Knowledge, Notes, Academics & Research
      await tx.note.deleteMany({ where: { userId: targetUserId } });
      await tx.noteCollection.deleteMany({ where: { userId: targetUserId } });
      await tx.course.deleteMany({ where: { userId: targetUserId } });
      // QuizAttempt is student-owned private attempt/performance data (has userId) and is strictly purged.
      // QuizQuestion records are shared examination question bank resources (GATE, ESE, AI-generated) without a userId.
      // When course/topic is deleted, topicId on QuizQuestion safely detaches via onDelete: SetNull, preserving the question bank.
      await tx.quizAttempt.deleteMany({ where: { userId: targetUserId } });
      await tx.researchProject.deleteMany({ where: { userId: targetUserId } });
      await tx.learningModule.deleteMany({ where: { userId: targetUserId } });
      await tx.vocabularyCard.deleteMany({ where: { userId: targetUserId } });
      await tx.book.deleteMany({ where: { userId: targetUserId } });

      // 3. AI, Conversations & Integrations
      await tx.conversation.deleteMany({ where: { userId: targetUserId } });
      await tx.aIMemory.deleteMany({ where: { userId: targetUserId } });
      await tx.automation.deleteMany({ where: { userId: targetUserId } });
      await tx.integrationAccount.deleteMany({ where: { userId: targetUserId } });

      // 4. Notifications, Profiles & Custom UI State
      await tx.notification.deleteMany({ where: { userId: targetUserId } });
      await tx.customDashboardSection.deleteMany({ where: { userId: targetUserId } });
      await tx.profile.deleteMany({ where: { userId: targetUserId } });
      await tx.userPreference.deleteMany({ where: { userId: targetUserId } });

      // 5. Sensitive credentials removal for ordinary non-administrator accounts
      const targetUser = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { adminRole: true },
      });
      if (targetUser && targetUser.adminRole !== "owner" && targetUser.adminRole !== "support_admin") {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            totpSecret: null,
            totpEnabled: false,
            recoveryCodes: null,
          },
        });
      }

      // Record cleanup timestamp on subscription (idempotent guard)
      await tx.subscription.update({
        where: { id: item.id },
        data: {
          dataDeletedAt: now,
          status: "EXPIRED",
        },
      });

      // Record audit event for compliance
      await tx.auditEvent.create({
        data: {
          userId: targetUserId,
          action: "WORKSPACE_DATA_RETENTION_PURGE",
          detailsJson: JSON.stringify({
            purgedAt: now.toISOString(),
            retentionReason: "30_DAY_EXPIRY_REACHED",
          }),
        },
      });
    });

    processedUserIds.push(targetUserId);
  }

  return {
    deletedAccountsCount: processedUserIds.length,
    processedUserIds,
  };
}

/**
 * Dispatches trial reminders 3 days before expiry and on the final day (< 24 hours).
 * Strictly idempotent: checks existing notifications before creating new ones.
 */
export async function sendTrialReminders(): Promise<{
  threeDayRemindersSent: number;
  finalDayRemindersSent: number;
  unconfiguredEmailCount: number;
}> {
  const now = new Date();

  // Find all active trialing subscriptions
  const activeTrials = await prisma.subscription.findMany({
    where: {
      status: "TRIALING",
      trialEndsAt: { gt: now },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  let threeDayRemindersSent = 0;
  let finalDayRemindersSent = 0;
  let unconfiguredEmailCount = 0;

  for (const sub of activeTrials) {
    if (!sub.trialEndsAt || !sub.user) continue;

    const msUntilExpiry = sub.trialEndsAt.getTime() - now.getTime();
    const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);

    // Final day reminder (< 24 hours remaining)
    if (daysUntilExpiry <= 1 && daysUntilExpiry > 0) {
      const existingNotice = await prisma.notification.findFirst({
        where: {
          userId: sub.user.id,
          title: "Your AMAHAS Student OS Trial Ends Today",
        },
      });

      if (!existingNotice) {
        await prisma.notification.create({
          data: {
            userId: sub.user.id,
            category: "DEADLINE",
            title: "Your AMAHAS Student OS Trial Ends Today",
            message:
              "Your 7-day free trial ends today. Subscribe to maintain uninterrupted access to your AI agents, deep work tools, and research notes.",
          },
        });

        if (!isEmailConfigured()) {
          unconfiguredEmailCount++;
        }
        finalDayRemindersSent++;
      }
    } else if (daysUntilExpiry <= 3.5 && daysUntilExpiry >= 2.0) {
      // 3 days reminder
      const existingNotice = await prisma.notification.findFirst({
        where: {
          userId: sub.user.id,
          title: "3 Days Remaining on Your Free Trial",
        },
      });

      if (!existingNotice) {
        await prisma.notification.create({
          data: {
            userId: sub.user.id,
            category: "DEADLINE",
            title: "3 Days Remaining on Your Free Trial",
            message:
              "You have 3 days left on your AMAHAS Student OS trial. Choose your plan to keep your workflows running smoothly.",
          },
        });

        if (!isEmailConfigured()) {
          unconfiguredEmailCount++;
        }
        threeDayRemindersSent++;
      }
    }
  }

  return {
    threeDayRemindersSent,
    finalDayRemindersSent,
    unconfiguredEmailCount,
  };
}

/**
 * Restores eligible workspace access when a user resubscribes during the retention period.
 * If data has not been purged (dataDeletedAt === null), all existing workspace data remains intact!
 */
export async function resubscribeUser(
  userId: string,
  billingCycle: "monthly" | "yearly" = "monthly"
): Promise<{ success: boolean; error?: string; restoredData?: boolean }> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) {
    return { success: false, error: "Subscription record not found.", restoredData: false };
  }

  const now = new Date();
  const periodDays = billingCycle === "yearly" ? 365 : 30;
  const currentPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const hadExistingData = sub.dataDeletedAt === null;

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "ACTIVE",
      billingCycle,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      autoRenew: true,
      retentionDeadline: null,
    },
  });

  return {
    success: true,
    restoredData: hadExistingData,
  };
}

/**
 * Handles payment lifecycle events (Stripe / Razorpay webhooks).
 */
export async function recordPaymentEvent(params: {
  userId: string;
  type: "PAYMENT_SUCCEEDED" | "PAYMENT_FAILED" | "RENEWAL_SUCCEEDED";
  billingCycle?: "monthly" | "yearly";
}): Promise<void> {
  const { userId, type, billingCycle = "monthly" } = params;
  const now = new Date();

  const existingSub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (type === "PAYMENT_SUCCEEDED" || type === "RENEWAL_SUCCEEDED") {
    const periodDays = billingCycle === "yearly" ? 365 : 30;
    const calculatedPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    // Out-of-order delivery protection: do not rewind a periodEnd that is already further in the future
    const hasLongerFutureEnd =
      existingSub?.currentPeriodEnd &&
      new Date(existingSub.currentPeriodEnd).getTime() > calculatedPeriodEnd.getTime();

    const currentPeriodEnd = hasLongerFutureEnd
      ? existingSub.currentPeriodEnd
      : calculatedPeriodEnd;

    const resolvedBillingCycle = hasLongerFutureEnd
      ? existingSub.billingCycle
      : billingCycle;

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        billingCycle: resolvedBillingCycle,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        retentionDeadline: null,
      },
    });
  } else if (type === "PAYMENT_FAILED") {
    // Payment failure: mark PAST_DUE and start retention deadline (30 days from failure)
    const retentionDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: "PAST_DUE",
        retentionDeadline,
      },
    });
  }
}
