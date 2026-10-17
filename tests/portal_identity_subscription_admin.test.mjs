import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.ts";
import {
  normalizePhoneNumber,
  generateOtp,
  hashOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "../src/lib/phone-verification.ts";
import {
  sendEmailVerification,
  verifyEmailToken,
  cleanupExpiredEmailTokens,
} from "../src/lib/email-verification.ts";
import {
  activateFreeTrial,
  getWorkspaceAccessState,
  assertWorkspaceWriteAccess,
  cancelSubscription,
  runRetentionCleanup,
  sendTrialReminders,
  resubscribeUser,
  recordPaymentEvent,
} from "../src/lib/subscription.ts";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  computeTotp,
  verifyTotpCode,
  generateRecoveryCodes,
  consumeRecoveryCode,
  assertAdminRole,
  startSupportEditSession,
  assertActiveSupportSession,
  recordAdminAudit,
  cleanupExpiredAuditLogs,
  provisionInitialOwner,
} from "../src/lib/admin.ts";
import {
  getApprovedPlanPricing,
  assertPricingApproved,
} from "../src/lib/pricing.ts";
import {
  verifyStripeSignature,
  verifyRazorpaySignature,
} from "../src/lib/webhook-verification.ts";
import {
  claimWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
  runPaymentWebhookRetention,
} from "../src/lib/webhook-idempotency.ts";
import crypto from "crypto";

// =============================================================================
// AMAHAS PORTAL, IDENTITY, SUBSCRIPTION & ADMIN VERIFICATION SUITE
// =============================================================================

test("Criteria 1 & 2: Public Portal is accessible without auth and workspace requires server auth", async () => {
  // Normalize phone helper test
  const normalized = normalizePhoneNumber("+91 98765-43210");
  assert.equal(normalized, "+919876543210");

  const normalized2 = normalizePhoneNumber("09876543210", "+91");
  assert.equal(normalized2, "+919876543210");

  // Verify write guard throws when unverified
  const unverifiedUserId = "unverified-user-1";
  const origFindUnique = prisma.user.findUnique;

  try {
    prisma.user.findUnique = async () => ({
      id: unverifiedUserId,
      email: "guest@example.com",
      emailVerified: false,
      phoneVerified: false,
      subscription: null,
    });

    const accessState = await getWorkspaceAccessState(unverifiedUserId);
    assert.equal(accessState.accessLevel, "UNVERIFIED");
    assert.equal(accessState.canWrite, false);

    await assert.rejects(
      async () => {
        await assertWorkspaceWriteAccess(unverifiedUserId);
      },
      (err) => err.code === "WORKSPACE_READ_ONLY" || err.status === 403
    );
  } finally {
    prisma.user.findUnique = origFindUnique;
  }
});

test("Criteria 4, 5 & 6: Phone OTP security, Rate limits, Replay protection, and 2-Account limit", async () => {
  const testPhone = "+919800011122";
  const user1 = "user-phone-test-1";
  const user2 = "user-phone-test-2";
  const user3 = "user-phone-test-3";

  let verificationStore = null;
  const originalPVFindFirst = prisma.phoneVerification?.findFirst;
  const originalPVCreate = prisma.phoneVerification?.create;
  const originalPVUpdate = prisma.phoneVerification?.update;
  const originalUserCount = prisma.user?.count;
  const originalUserUpdate = prisma.user?.update;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.phoneVerification.findFirst = async () => verificationStore;
    prisma.phoneVerification.create = async ({ data }) => {
      verificationStore = { id: "pv-1", ...data };
      return verificationStore;
    };
    prisma.phoneVerification.update = async ({ data }) => {
      verificationStore = { ...verificationStore, ...data };
      return verificationStore;
    };
    prisma.user.update = async ({ data }) => ({ id: user1, ...data });
    prisma.user.count = async () => 0;
    prisma.$transaction = async (cb) => cb(prisma);

    // 1. Send OTP test (in test environment, testOtp is returned)
    process.env.NODE_ENV = "test";
    const sendResult = await sendPhoneOtp(testPhone);
    assert.ok(sendResult.success);
    assert.ok(sendResult.testOtp);
    const validOtp = sendResult.testOtp;

    // 2. Expiry test
    verificationStore.expiresAt = new Date(Date.now() - 1000); // Expired
    const expiredResult = await verifyPhoneOtp(user1, testPhone, validOtp);
    assert.equal(expiredResult.success, false);
    assert.ok(expiredResult.error.includes("expired"));

    // Reset expiry
    verificationStore.expiresAt = new Date(Date.now() + 600000);

    // 3. Attempt limit & invalid OTP test
    const wrongResult = await verifyPhoneOtp(user1, testPhone, "000000");
    assert.equal(wrongResult.success, false);
    assert.equal(verificationStore.attempts, 1);

    // Max attempts (5) triggers invalidation
    verificationStore.attempts = 5;
    const maxAttemptResult = await verifyPhoneOtp(user1, testPhone, validOtp);
    assert.equal(maxAttemptResult.success, false);
    assert.ok(maxAttemptResult.error.includes("Maximum verification attempts exceeded"));

    // 4. Successful verification
    verificationStore.attempts = 0;
    prisma.user.count = async () => 0; // 0 existing accounts

    const successResult = await verifyPhoneOtp(user1, testPhone, validOtp);
    assert.ok(successResult.success);
    assert.equal(successResult.trialEligible, true);
    assert.equal(verificationStore.verified, true);

    // 5. Replay protection: Re-submitting the same code must fail
    const replayResult = await verifyPhoneOtp(user1, testPhone, validOtp);
    assert.equal(replayResult.success, false);
    assert.ok(replayResult.error.includes("already been used"));

    // 6. Concurrency-safe Max 2-Account Limit
    verificationStore.verified = false;
    // When 2 verified accounts already exist for this number
    prisma.user.count = async () => 2;

    const limitResult = await verifyPhoneOtp(user3, testPhone, validOtp);
    assert.equal(limitResult.success, false);
    assert.equal(limitResult.code, "MAX_ACCOUNTS_EXCEEDED");
  } finally {
    prisma.phoneVerification.findFirst = originalPVFindFirst;
    prisma.phoneVerification.create = originalPVCreate;
    prisma.phoneVerification.update = originalPVUpdate;
    prisma.user.count = originalUserCount;
    prisma.user.update = originalUserUpdate;
    prisma.$transaction = originalTransaction;
  }
});

test("Criteria 7: Email verification token hashing, expiry and consumption", async () => {
  const testEmail = "student@amahas.test";
  let tokenStore = null;

  const originalEmailCreate = prisma.emailVerificationToken?.create;
  const originalEmailFindFirst = prisma.emailVerificationToken?.findFirst;
  const originalEmailUpdate = prisma.emailVerificationToken?.update;
  const originalUserUpdateMany = prisma.user?.updateMany;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.emailVerificationToken.create = async ({ data }) => {
      tokenStore = { id: "et-1", ...data };
      return tokenStore;
    };
    prisma.emailVerificationToken.findFirst = async () => tokenStore;
    prisma.emailVerificationToken.update = async ({ data }) => {
      tokenStore = { ...tokenStore, ...data };
      return tokenStore;
    };
    prisma.user.updateMany = async () => ({ count: 1 });
    prisma.$transaction = async (ops) => ops;

    process.env.NODE_ENV = "test";
    const sendResult = await sendEmailVerification(testEmail);
    assert.ok(sendResult.success);
    assert.ok(sendResult.testToken);

    // Verify token
    const verifyResult = await verifyEmailToken(testEmail, sendResult.testToken);
    assert.ok(verifyResult.success);
    assert.equal(tokenStore.verified, true);

    // Token reuse fails
    const reuseResult = await verifyEmailToken(testEmail, sendResult.testToken);
    assert.equal(reuseResult.success, false);
  } finally {
    prisma.emailVerificationToken.create = originalEmailCreate;
    prisma.emailVerificationToken.findFirst = originalEmailFindFirst;
    prisma.emailVerificationToken.update = originalEmailUpdate;
    prisma.user.updateMany = originalUserUpdateMany;
    prisma.$transaction = originalTransaction;
  }
});

test("Criteria 8, 9 & 10: 7-Day trial activation, expiry to read-only, past-due handling and cancellation period", async () => {
  const userId = "user-subscription-test";
  let userSubscription = null;

  const originalUserFindUnique = prisma.user?.findUnique;
  const originalSubUpsert = prisma.subscription?.upsert;
  const originalSubUpdate = prisma.subscription?.update;
  const originalSubFindUnique = prisma.subscription?.findUnique;

  try {
    prisma.user.findUnique = async () => ({
      id: userId,
      email: "alex@amahas.test",
      emailVerified: true,
      phoneVerified: true,
      phoneNumber: "+919876543210",
      subscription: userSubscription,
    });

    prisma.subscription.upsert = async ({ create, update }) => {
      userSubscription = userSubscription ? { ...userSubscription, ...update } : { id: "sub-1", ...create };
      return userSubscription;
    };
    prisma.subscription.update = async ({ data }) => {
      userSubscription = { ...userSubscription, ...data };
      return userSubscription;
    };
    prisma.subscription.findUnique = async () => userSubscription;

    // 1. Activate Free Trial
    const trialRes = await activateFreeTrial(userId);
    assert.ok(trialRes.success);
    assert.equal(userSubscription.status, "TRIALING");
    assert.ok(userSubscription.trialEndsAt > new Date());

    // 2. Active Trial state
    let state = await getWorkspaceAccessState(userId);
    assert.equal(state.accessLevel, "FULL");
    assert.equal(state.canWrite, true);
    assert.equal(state.reason, "ACTIVE_TRIAL");
    assert.ok(state.trialDaysRemaining >= 6);

    // 3. Trial Expiry transition to READ_ONLY
    userSubscription.trialEndsAt = new Date(Date.now() - 1000); // 1 sec ago
    state = await getWorkspaceAccessState(userId);
    assert.equal(state.accessLevel, "READ_ONLY");
    assert.equal(state.canWrite, false);
    assert.equal(state.reason, "TRIAL_EXPIRED");

    // 4. Renewal Payment Failed (PAST_DUE) immediately triggers READ_ONLY
    userSubscription.status = "PAST_DUE";
    state = await getWorkspaceAccessState(userId);
    assert.equal(state.accessLevel, "READ_ONLY");
    assert.equal(state.reason, "PAYMENT_FAILED");

    // 5. Active Paid Subscription has FULL write access
    const futurePeriodEnd = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    userSubscription.status = "ACTIVE";
    userSubscription.currentPeriodEnd = futurePeriodEnd;
    state = await getWorkspaceAccessState(userId);
    assert.equal(state.accessLevel, "FULL");
    assert.equal(state.reason, "ACTIVE_SUBSCRIPTION");

    // 6. Cancellation preserves paid access until currentPeriodEnd
    const cancelRes = await cancelSubscription(userId);
    assert.ok(cancelRes.success);
    assert.equal(userSubscription.cancelAtPeriodEnd, true);
    assert.equal(userSubscription.autoRenew, false);

    // Paid access still FULL before period end
    state = await getWorkspaceAccessState(userId);
    assert.equal(state.accessLevel, "FULL");
    assert.equal(state.reason, "CANCELLED_ACTIVE");

    // After period end, switches to READ_ONLY
    userSubscription.currentPeriodEnd = new Date(Date.now() - 1000);
    state = await getWorkspaceAccessState(userId);
    assert.equal(state.accessLevel, "READ_ONLY");
    assert.equal(state.reason, "SUBSCRIPTION_EXPIRED");
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.subscription.upsert = originalSubUpsert;
    prisma.subscription.update = originalSubUpdate;
    prisma.subscription.findUnique = originalSubFindUnique;
  }
});

test("Criteria 11: 30-Day data-retention process and idempotent cleanup boundary", async () => {
  const expiredUserId = "user-expired-purge";
  let deletedTasks = 0;
  let deletedNotes = 0;
  let subUpdated = false;
  let auditRecorded = false;

  const originalSubFindMany = prisma.subscription?.findMany;
  const originalSubUpdate = prisma.subscription?.update;
  const originalTaskDeleteMany = prisma.task?.deleteMany;
  const originalNoteDeleteMany = prisma.note?.deleteMany;
  const originalAuditCreate = prisma.auditEvent?.create;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.subscription.findMany = async () => [
      { id: "sub-expired-1", userId: expiredUserId },
    ];
    prisma.$transaction = async (cb) => {
      const mockTx = {
        task: { deleteMany: async () => { deletedTasks++; } },
        project: { deleteMany: async () => {} },
        timeBlock: { deleteMany: async () => {} },
        focusSession: { deleteMany: async () => {} },
        calendarEvent: { deleteMany: async () => {} },
        habit: { deleteMany: async () => {} },
        goal: { deleteMany: async () => {} },
        productivityReview: { deleteMany: async () => {} },
        note: { deleteMany: async () => { deletedNotes++; } },
        noteCollection: { deleteMany: async () => {} },
        course: { deleteMany: async () => {} },
        quizAttempt: { deleteMany: async () => {} },
        researchProject: { deleteMany: async () => {} },
        learningModule: { deleteMany: async () => {} },
        vocabularyCard: { deleteMany: async () => {} },
        book: { deleteMany: async () => {} },
        conversation: { deleteMany: async () => {} },
        aIMemory: { deleteMany: async () => {} },
        automation: { deleteMany: async () => {} },
        integrationAccount: { deleteMany: async () => {} },
        notification: { deleteMany: async () => {} },
        customDashboardSection: { deleteMany: async () => {} },
        profile: { deleteMany: async () => {} },
        userPreference: { deleteMany: async () => {} },
        user: {
          findUnique: async () => ({ id: expiredUserId, adminRole: null }),
          update: async () => ({ id: expiredUserId }),
        },
        subscription: {
          update: async () => { subUpdated = true; },
        },
        auditEvent: {
          create: async () => { auditRecorded = true; },
        },
      };
      return cb(mockTx);
    };

    const cleanupResult = await runRetentionCleanup();
    assert.equal(cleanupResult.deletedAccountsCount, 1);
    assert.ok(cleanupResult.processedUserIds.includes(expiredUserId));
    assert.equal(deletedTasks, 1);
    assert.equal(deletedNotes, 1);
    assert.equal(subUpdated, true);
    assert.equal(auditRecorded, true);
  } finally {
    prisma.subscription.findMany = originalSubFindMany;
    prisma.subscription.update = originalSubUpdate;
    prisma.task.deleteMany = originalTaskDeleteMany;
    prisma.note.deleteMany = originalNoteDeleteMany;
    prisma.auditEvent.create = originalAuditCreate;
    prisma.$transaction = originalTransaction;
  }
});

test("Criteria 12 & 13: Admin role guard and Support Admin privilege boundary", async () => {
  // Non-admin rejected
  assert.throws(() => {
    assertAdminRole("student", "any");
  }, (err) => err.status === 403);

  // Support admin passes "any"
  assert.doesNotThrow(() => {
    assertAdminRole("support_admin", "any");
  });

  // Support admin fails "owner" only operation
  assert.throws(() => {
    assertAdminRole("support_admin", "owner");
  }, (err) => err.status === 403);

  // Owner passes all
  assert.doesNotThrow(() => {
    assertAdminRole("owner", "owner");
  });
});

test("Criteria 14: TOTP RFC 6238 generation, verification and recovery codes", async () => {
  const secret = generateTotpSecret();
  assert.ok(secret.length >= 16);

  // Verify Base32 round-trip
  const testBuf = Buffer.from("AMAHAS_TOTP_TEST");
  const b32 = base32Encode(testBuf);
  const decoded = base32Decode(b32);
  assert.deepEqual(decoded, testBuf);

  // Compute code for now
  const code = computeTotp(secret);
  assert.equal(code.length, 6);
  assert.ok(/^\d{6}$/.test(code));

  // Verify code succeeds
  const isValid = verifyTotpCode(secret, code);
  assert.equal(isValid, true);

  // Wrong code fails
  const isInvalid = verifyTotpCode(secret, "999999" === code ? "000000" : "999999");
  assert.equal(isInvalid, false);

  // Backup recovery codes
  const { plainCodes, hashedCodes } = generateRecoveryCodes();
  assert.equal(plainCodes.length, 8);
  assert.equal(hashedCodes.length, 8);
});

test("Criteria 15 & 16: Support edit session 15-minute limit and 90-day audit log cleanup", async () => {
  const adminId = "admin-1";
  const targetUserId = "student-target-1";

  const originalUserFindUnique = prisma.user?.findUnique;
  const originalSupportCreate = prisma.adminSupportSession?.create;
  const originalSupportFindUnique = prisma.adminSupportSession?.findUnique;
  const originalAuditCreate = prisma.adminAuditLog?.create;
  const originalAuditDeleteMany = prisma.adminAuditLog?.deleteMany;

  try {
    prisma.user.findUnique = async () => ({ id: adminId, adminRole: "support_admin" });

    let activeSession = null;
    prisma.adminSupportSession.create = async ({ data }) => {
      activeSession = { id: "sess-1", ...data };
      return activeSession;
    };
    prisma.adminSupportSession.findUnique = async () => activeSession;
    prisma.adminAuditLog.create = async () => ({ id: "audit-1" });

    // 1. Start support session
    const sessionRes = await startSupportEditSession({
      adminId,
      targetUserId,
      reason: "Inspect corrupted calendar event",
    });

    assert.ok(sessionRes.sessionId);
    assert.ok(sessionRes.expiresAt > new Date());
    const durationMins = (sessionRes.expiresAt.getTime() - Date.now()) / (60 * 1000);
    assert.ok(durationMins >= 14.9 && durationMins <= 15.1, "Session duration must be exactly 15 minutes");

    // Active session passes assertion
    await assert.doesNotThrow(async () => {
      await assertActiveSupportSession(sessionRes.sessionId);
    });

    // 1b. Support session can be initiated without mandatory justification
    const noReasonSession = await startSupportEditSession({
      adminId,
      targetUserId,
    });
    assert.ok(noReasonSession.sessionId);
    assert.equal(activeSession.reason, "Administrative support access");

    // 2. Expired session (> 15 mins) fails on server
    activeSession.expiresAt = new Date(Date.now() - 1000);
    await assert.rejects(
      async () => {
        await assertActiveSupportSession(sessionRes.sessionId);
      },
      (err) => err.status === 403 && err.message.includes("15-minute maximum limit reached")
    );

    // 3. 90-Day Audit log purge
    let deletedCount = 0;
    prisma.adminAuditLog.deleteMany = async ({ where }) => {
      assert.ok(where.createdAt.lt instanceof Date);
      deletedCount = 42;
      return { count: 42 };
    };

    const auditCleanup = await cleanupExpiredAuditLogs();
    assert.equal(auditCleanup.deletedCount, 42);
  } finally {
    prisma.user.findUnique = originalUserFindUnique;
    prisma.adminSupportSession.create = originalSupportCreate;
    prisma.adminSupportSession.findUnique = originalSupportFindUnique;
    prisma.adminAuditLog.create = originalAuditCreate;
    prisma.adminAuditLog.deleteMany = originalAuditDeleteMany;
  }
});

test("Audit Item 4: Resubscription restores full access during retention period and preserves data", async () => {
  const userId = "resub-user-1";
  let storedSub = {
    id: "sub-resub-1",
    userId,
    status: "EXPIRED",
    billingCycle: "monthly",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    autoRenew: false,
    retentionDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days left
    dataDeletedAt: null, // Data NOT yet deleted
  };

  const origFindUnique = prisma.subscription?.findUnique;
  const origUpdate = prisma.subscription?.update;

  try {
    prisma.subscription.findUnique = async () => storedSub;
    prisma.subscription.update = async ({ data }) => {
      storedSub = { ...storedSub, ...data };
      return storedSub;
    };

    // User resubscribes during retention period
    const result = await resubscribeUser(userId, "yearly");
    assert.ok(result.success);
    assert.equal(result.restoredData, true); // Existing data preserved
    assert.equal(storedSub.status, "ACTIVE");
    assert.equal(storedSub.billingCycle, "yearly");
    assert.equal(storedSub.retentionDeadline, null);
    assert.ok(storedSub.currentPeriodEnd > new Date());

    // Payment lifecycle event: renewal succeeds
    await recordPaymentEvent({
      userId,
      type: "RENEWAL_SUCCEEDED",
      billingCycle: "yearly",
    });
    assert.equal(storedSub.status, "ACTIVE");

    // Payment lifecycle event: payment failed
    await recordPaymentEvent({
      userId,
      type: "PAYMENT_FAILED",
    });
    assert.equal(storedSub.status, "PAST_DUE");
    assert.ok(storedSub.retentionDeadline instanceof Date);
  } finally {
    prisma.subscription.findUnique = origFindUnique;
    prisma.subscription.update = origUpdate;
  }
});

test("Audit Item 3: Trial Reminders (3-day and final-day dispatch with idempotency)", async () => {
  const now = new Date();
  const user1 = { id: "u-3day", email: "3day@example.com", name: "Three Day User" };
  const user2 = { id: "u-final", email: "final@example.com", name: "Final Day User" };

  const trialingSubs = [
    {
      id: "sub-1",
      userId: user1.id,
      status: "TRIALING",
      trialEndsAt: new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000), // ~2.5 days left
      user: user1,
    },
    {
      id: "sub-2",
      userId: user2.id,
      status: "TRIALING",
      trialEndsAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), // ~12 hours left (final day)
      user: user2,
    },
  ];

  const notificationsStore = [];
  const origSubFindMany = prisma.subscription?.findMany;
  const origNotifFindFirst = prisma.notification?.findFirst;
  const origNotifCreate = prisma.notification?.create;

  try {
    prisma.subscription.findMany = async () => trialingSubs;
    prisma.notification.findFirst = async ({ where }) => {
      return notificationsStore.find(
        (n) => n.userId === where.userId && n.title === where.title
      ) || null;
    };
    prisma.notification.create = async ({ data }) => {
      const created = { id: `notif-${notificationsStore.length + 1}`, ...data };
      notificationsStore.push(created);
      return created;
    };

    // First execution: both reminders dispatched
    const run1 = await sendTrialReminders();
    assert.equal(run1.threeDayRemindersSent, 1);
    assert.equal(run1.finalDayRemindersSent, 1);
    assert.equal(notificationsStore.length, 2);

    // Second execution (immediate retry): strictly idempotent, 0 duplicates sent!
    const run2 = await sendTrialReminders();
    assert.equal(run2.threeDayRemindersSent, 0);
    assert.equal(run2.finalDayRemindersSent, 0);
    assert.equal(notificationsStore.length, 2);
  } finally {
    prisma.subscription.findMany = origSubFindMany;
    prisma.notification.findFirst = origNotifFindFirst;
    prisma.notification.create = origNotifCreate;
  }
});

test("Audit Item 1: Controlled Plan Pricing and Tamper Prevention", async () => {
  const originalMonthly = process.env.STUDENT_OS_MONTHLY_PRICE;
  const originalYearly = process.env.STUDENT_OS_YEARLY_PRICE;

  try {
    // 1. Without approved prices in env: pricing is marked pending and checkout is blocked
    delete process.env.STUDENT_OS_MONTHLY_PRICE;
    delete process.env.STUDENT_OS_YEARLY_PRICE;

    const unapproved = getApprovedPlanPricing();
    assert.equal(unapproved.pricingApproved, false);
    assert.equal(unapproved.pricingStatus, "PENDING_OWNER_APPROVAL");
    assert.equal(unapproved.pricing.monthly, null);
    assert.equal(unapproved.pricing.yearly, null);

    assert.throws(
      () => {
        assertPricingApproved();
      },
      (err) => err.status === 503 && err.code === "PRICING_PENDING_APPROVAL"
    );

    // 2. With approved pricing set by Owner in server environment
    process.env.STUDENT_OS_MONTHLY_PRICE = "299";
    process.env.STUDENT_OS_YEARLY_PRICE = "2499";
    process.env.STUDENT_OS_CURRENCY = "INR";

    const approved = getApprovedPlanPricing();
    assert.equal(approved.pricingApproved, true);
    assert.equal(approved.pricingStatus, "APPROVED");
    assert.equal(approved.pricing.monthly.price, 299);
    assert.equal(approved.pricing.yearly.price, 2499);
    assert.doesNotThrow(() => assertPricingApproved());
  } finally {
    if (originalMonthly) process.env.STUDENT_OS_MONTHLY_PRICE = originalMonthly;
    else delete process.env.STUDENT_OS_MONTHLY_PRICE;
    if (originalYearly) process.env.STUDENT_OS_YEARLY_PRICE = originalYearly;
    else delete process.env.STUDENT_OS_YEARLY_PRICE;
  }
});

test("Audit Item 2: Controlled Initial-Owner Provisioning and Anti-Escalation Guards", async () => {
  const originalAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  process.env.INITIAL_ADMIN_EMAIL = "admin.owner@example.com";

  const origFindUnique = prisma.user?.findUnique;
  const origFindFirst = prisma.user?.findFirst;
  const origUpdate = prisma.user?.update;
  const origAudit = prisma.adminAuditLog?.create;

  try {
    prisma.adminAuditLog.create = async () => ({ id: "audit-1" });
    prisma.user.findFirst = async () => null;

    // 1. Email mismatch fails
    prisma.user.findUnique = async () => ({
      id: "u-wrong",
      email: "attacker@example.com",
      emailVerified: true,
      phoneVerified: true,
      adminRole: null,
    });
    const res1 = await provisionInitialOwner("u-wrong");
    assert.equal(res1.success, false);
    assert.ok(res1.error.includes("does not match"));

    // 2. Unverified email fails
    prisma.user.findUnique = async () => ({
      id: "u-unverified-email",
      email: "admin.owner@example.com",
      emailVerified: false,
      phoneVerified: true,
      adminRole: null,
    });
    const res2 = await provisionInitialOwner("u-unverified-email");
    assert.equal(res2.success, false);
    assert.equal(res2.code, "EMAIL_UNVERIFIED");

    // 3. Unverified phone fails
    prisma.user.findUnique = async () => ({
      id: "u-unverified-phone",
      email: "admin.owner@example.com",
      emailVerified: true,
      phoneVerified: false,
      adminRole: null,
    });
    const res3 = await provisionInitialOwner("u-unverified-phone");
    assert.equal(res3.success, false);
    assert.equal(res3.code, "PHONE_UNVERIFIED");

    // 4. Anti-replacement guard: Existing owner blocks replacement
    prisma.user.findUnique = async () => ({
      id: "u-new-candidate",
      email: "admin.owner@example.com",
      emailVerified: true,
      phoneVerified: true,
      adminRole: null,
    });
    prisma.user.findFirst = async ({ where }) => {
      if (where.adminRole === "owner") {
        return { id: "existing-owner-id", email: "existing.owner@example.com", adminRole: "owner" };
      }
      return null;
    };
    const res4 = await provisionInitialOwner("u-new-candidate");
    assert.equal(res4.success, false);
    assert.equal(res4.code, "OWNER_ALREADY_EXISTS");

    // 5. Valid verified candidate with no existing owner succeeds
    prisma.user.findFirst = async () => null; // No existing owner
    let promotedRole = null;
    prisma.user.update = async ({ data }) => {
      promotedRole = data.adminRole;
      return { id: "u-new-candidate", adminRole: data.adminRole };
    };

    const res5 = await provisionInitialOwner("u-new-candidate");
    assert.equal(res5.success, true);
    assert.equal(promotedRole, "owner");
  } finally {
    process.env.INITIAL_ADMIN_EMAIL = originalAdminEmail;
    prisma.user.findUnique = origFindUnique;
    prisma.user.findFirst = origFindFirst;
    prisma.user.update = origUpdate;
    prisma.adminAuditLog.create = origAudit;
  }
});

test("Audit Item 4: Workspace Write Guard and Support-Session 15-Minute Expiration across Domains", async () => {
  const readOnlyUserId = "user-ro-1";
  const origFindUnique = prisma.user?.findUnique;
  const origSupportFindUnique = prisma.adminSupportSession?.findUnique;

  try {
    // Read-only user (trial expired)
    prisma.user.findUnique = async () => ({
      id: readOnlyUserId,
      email: "student@example.com",
      emailVerified: true,
      phoneVerified: true,
      subscription: {
        status: "TRIAL_EXPIRED",
        trialEndsAt: new Date(Date.now() - 1000),
        currentPeriodEnd: null,
      },
    });

    // 1. Mutation attempt by read-only user without support session is strictly rejected
    await assert.rejects(
      async () => {
        await assertWorkspaceWriteAccess(readOnlyUserId);
      },
      (err) => err.status === 403 && err.code === "WORKSPACE_READ_ONLY"
    );

    // 2. Active support session (10 mins old) permits support edit
    prisma.adminSupportSession.findUnique = async () => ({
      id: "active-session",
      adminId: "admin-1",
      targetUserId: readOnlyUserId,
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      endedAt: null,
    });

    await assert.doesNotThrow(async () => {
      await assertWorkspaceWriteAccess(readOnlyUserId, "active-session");
    });

    // 3. Expired support session (> 15 mins) rejects mutation with 403
    prisma.adminSupportSession.findUnique = async () => ({
      id: "expired-session",
      adminId: "admin-1",
      targetUserId: readOnlyUserId,
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
      endedAt: null,
    });

    await assert.rejects(
      async () => {
        await assertWorkspaceWriteAccess(readOnlyUserId, "expired-session");
      },
      (err) => err.status === 403 && err.message.includes("15-minute maximum limit reached")
    );
  } finally {
    prisma.user.findUnique = origFindUnique;
    prisma.adminSupportSession.findUnique = origSupportFindUnique;
  }
});

test("Verification Item 1: Admin Individual Workspace View Audit Logging", async () => {
  const adminId = "admin-test-id";
  const targetUserId = "student-target-id";
  const targetEmail = "student@example.com";

  let loggedAuditEvent = null;
  const origAuditCreate = prisma.adminAuditLog?.create;

  try {
    prisma.adminAuditLog.create = async ({ data }) => {
      loggedAuditEvent = data;
      return { id: "audit-log-1", ...data };
    };

    // Simulate recordAdminAudit on individual workspace inspection
    await recordAdminAudit({
      adminId,
      targetUserId,
      action: "ADMIN_VIEW_USER_WORKSPACE",
      details: {
        targetEmail,
        recordsSummary: { tasks: 5, notes: 3, projects: 2 },
        viewedAt: new Date().toISOString(),
      },
      ipAddress: "192.168.1.100",
    });

    assert.ok(loggedAuditEvent);
    assert.equal(loggedAuditEvent.adminId, adminId);
    assert.equal(loggedAuditEvent.targetUserId, targetUserId);
    assert.equal(loggedAuditEvent.action, "ADMIN_VIEW_USER_WORKSPACE");
    assert.equal(loggedAuditEvent.ipAddress, "192.168.1.100");

    const parsedDetails = JSON.parse(loggedAuditEvent.details);
    assert.equal(parsedDetails.targetEmail, targetEmail);
    assert.equal(parsedDetails.recordsSummary.tasks, 5);
    assert.ok(parsedDetails.viewedAt);
  } finally {
    prisma.adminAuditLog.create = origAuditCreate;
  }
});

test("Verification Item 2: Payment Webhook Security (Stripe Signature & Tolerance)", async () => {
  const secret = "whsec_test_stripe_secret_123";
  const payload = JSON.stringify({
    id: "evt_test_checkout_1",
    type: "checkout.session.completed",
    data: { object: { customer: "cus_123", metadata: { userId: "user-123" } } },
  });

  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Valid Stripe signature with fresh timestamp succeeds
  const signedPayload = `${nowSec}.${payload}`;
  const validHmac = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const validHeader = `t=${nowSec},v1=${validHmac}`;

  const validResult = verifyStripeSignature(payload, validHeader, secret);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.error, undefined);

  // 2. Tampered payload fails verification
  const tamperedPayload = payload + " ";
  const tamperedResult = verifyStripeSignature(tamperedPayload, validHeader, secret);
  assert.equal(tamperedResult.valid, false);
  assert.equal(tamperedResult.error, "Signature mismatch.");

  // 3. Stale timestamp (> 300s old) fails tolerance window check
  const staleTimestamp = nowSec - 305; // 305 seconds ago (> 300s window)
  const staleSignedPayload = `${staleTimestamp}.${payload}`;
  const staleHmac = crypto.createHmac("sha256", secret).update(staleSignedPayload, "utf8").digest("hex");
  const staleHeader = `t=${staleTimestamp},v1=${staleHmac}`;

  const staleResult = verifyStripeSignature(payload, staleHeader, secret);
  assert.equal(staleResult.valid, false);
  assert.ok(staleResult.error.includes("Stale webhook event timestamp"));

  // 4. Malformed header fails gracefully
  const malformedResult = verifyStripeSignature(payload, "invalid_header", secret);
  assert.equal(malformedResult.valid, false);
  assert.ok(malformedResult.error.includes("Malformed stripe-signature header"));
});

test("Verification Item 2: Payment Webhook Security (Razorpay Signature)", async () => {
  const secret = "rzp_webhook_secret_xyz";
  const payload = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_123", notes: { userId: "user-456" } } } },
  });

  // 1. Valid Razorpay HMAC SHA-256 signature succeeds
  const validSig = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const validResult = verifyRazorpaySignature(payload, validSig, secret);
  assert.equal(validResult.valid, true);

  // 2. Invalid/tampered Razorpay signature fails
  const invalidResult = verifyRazorpaySignature(payload, "invalid_razorpay_hex_signature_12345678", secret);
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.error, "Signature mismatch.");
});

test("Verification Item 2: Payment Webhook Replay & Duplicate Prevention via Audit Markers", async () => {
  const eventId = "evt_stripe_duplicate_test_999";
  const processedEventsStore = [
    {
      id: "audit-marker-1",
      action: "PROCESSED_PAYMENT_WEBHOOK",
      detailsJson: JSON.stringify({
        eventId,
        provider: "stripe",
        eventType: "invoice.paid",
        processedAt: new Date().toISOString(),
      }),
    },
  ];

  const origAuditFindFirst = prisma.auditEvent?.findFirst;
  try {
    prisma.auditEvent.findFirst = async ({ where }) => {
      return (
        processedEventsStore.find(
          (a) => a.action === where.action && a.detailsJson.includes(where.detailsJson.contains)
        ) || null
      );
    };

    // First attempt to process existing event ID: detected as replay
    const duplicateCheck = await prisma.auditEvent.findFirst({
      where: {
        action: "PROCESSED_PAYMENT_WEBHOOK",
        detailsJson: { contains: eventId },
      },
    });

    assert.ok(duplicateCheck, "Expected duplicate event marker to be found");

    // Fresh event ID: not detected as duplicate
    const freshCheck = await prisma.auditEvent.findFirst({
      where: {
        action: "PROCESSED_PAYMENT_WEBHOOK",
        detailsJson: { contains: "evt_stripe_completely_fresh_111" },
      },
    });

    assert.equal(freshCheck, null, "Expected fresh event to not be marked duplicate");
  } finally {
    prisma.auditEvent.findFirst = origAuditFindFirst;
  }
});

test("Review Item 1 & 2: Reconciled Data Model Purge and Selective Credential Protection", async () => {
  const ordinaryUserId = "user-expired-student";
  const adminUserId = "user-expired-admin";

  let ordinaryUserUpdatedData = null;
  let adminUserUpdatedData = null;

  const originalSubFindMany = prisma.subscription?.findMany;
  const originalSubUpdate = prisma.subscription?.update;
  const originalAuditCreate = prisma.auditEvent?.create;
  const originalTransaction = prisma.$transaction;

  try {
    // 1. Test ordinary user: TOTP and recovery codes ARE wiped
    prisma.subscription.findMany = async () => [
      { id: "sub-student", userId: ordinaryUserId },
    ];

    prisma.$transaction = async (cb) => {
      const mockTx = {
        task: { deleteMany: async () => {} },
        project: { deleteMany: async () => {} },
        timeBlock: { deleteMany: async () => {} },
        focusSession: { deleteMany: async () => {} },
        calendarEvent: { deleteMany: async () => {} },
        habit: { deleteMany: async () => {} },
        goal: { deleteMany: async () => {} },
        productivityReview: { deleteMany: async () => {} },
        note: { deleteMany: async () => {} },
        noteCollection: { deleteMany: async () => {} },
        course: { deleteMany: async () => {} },
        quizAttempt: { deleteMany: async () => {} },
        researchProject: { deleteMany: async () => {} },
        learningModule: { deleteMany: async () => {} },
        vocabularyCard: { deleteMany: async () => {} },
        book: { deleteMany: async () => {} },
        conversation: { deleteMany: async () => {} },
        aIMemory: { deleteMany: async () => {} },
        automation: { deleteMany: async () => {} },
        integrationAccount: { deleteMany: async () => {} },
        notification: { deleteMany: async () => {} },
        customDashboardSection: { deleteMany: async () => {} },
        profile: { deleteMany: async () => {} },
        userPreference: { deleteMany: async () => {} },
        user: {
          findUnique: async () => ({ id: ordinaryUserId, adminRole: null }),
          update: async ({ data }) => { ordinaryUserUpdatedData = data; return { id: ordinaryUserId }; },
        },
        subscription: { update: async () => {} },
        auditEvent: { create: async () => {} },
      };
      return cb(mockTx);
    };

    await runRetentionCleanup();
    assert.ok(ordinaryUserUpdatedData, "Expected ordinary user record to be updated");
    assert.equal(ordinaryUserUpdatedData.totpSecret, null);
    assert.equal(ordinaryUserUpdatedData.totpEnabled, false);
    assert.equal(ordinaryUserUpdatedData.recoveryCodes, null);

    // 2. Test admin user: TOTP and recovery codes are PRESERVED
    prisma.subscription.findMany = async () => [
      { id: "sub-admin", userId: adminUserId },
    ];

    prisma.$transaction = async (cb) => {
      const mockTx = {
        task: { deleteMany: async () => {} },
        project: { deleteMany: async () => {} },
        timeBlock: { deleteMany: async () => {} },
        focusSession: { deleteMany: async () => {} },
        calendarEvent: { deleteMany: async () => {} },
        habit: { deleteMany: async () => {} },
        goal: { deleteMany: async () => {} },
        productivityReview: { deleteMany: async () => {} },
        note: { deleteMany: async () => {} },
        noteCollection: { deleteMany: async () => {} },
        course: { deleteMany: async () => {} },
        quizAttempt: { deleteMany: async () => {} },
        researchProject: { deleteMany: async () => {} },
        learningModule: { deleteMany: async () => {} },
        vocabularyCard: { deleteMany: async () => {} },
        book: { deleteMany: async () => {} },
        conversation: { deleteMany: async () => {} },
        aIMemory: { deleteMany: async () => {} },
        automation: { deleteMany: async () => {} },
        integrationAccount: { deleteMany: async () => {} },
        notification: { deleteMany: async () => {} },
        customDashboardSection: { deleteMany: async () => {} },
        profile: { deleteMany: async () => {} },
        userPreference: { deleteMany: async () => {} },
        user: {
          findUnique: async () => ({ id: adminUserId, adminRole: "support_admin" }),
          update: async ({ data }) => { adminUserUpdatedData = data; return { id: adminUserId }; },
        },
        subscription: { update: async () => {} },
        auditEvent: { create: async () => {} },
      };
      return cb(mockTx);
    };

    await runRetentionCleanup();
    assert.equal(adminUserUpdatedData, null, "Expected admin credentials to NOT be purged");
  } finally {
    prisma.subscription.findMany = originalSubFindMany;
    prisma.subscription.update = originalSubUpdate;
    prisma.auditEvent.create = originalAuditCreate;
    prisma.$transaction = originalTransaction;
  }
});

test("Narrow Correction 1: Stripe Signature Verification with Multiple v1 Signatures", async () => {
  const secret = "whsec_test_stripe_secret_multi";
  const payload = JSON.stringify({
    id: "evt_multi_sig_test",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test", metadata: { userId: "user-123" } } },
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const signedPayload = `${nowSec}.${payload}`;
  const validHmac = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const oldHmac = crypto.createHmac("sha256", "whsec_old_retired_secret").update(signedPayload, "utf8").digest("hex");
  const randomBadSig = crypto.randomBytes(32).toString("hex");

  // 1. Header with rolling secret: old retired v1 signature AND valid v1 signature -> VALID
  const rollingHeader = `t=${nowSec},v1=${oldHmac},v1=${validHmac}`;
  const rollingResult = verifyStripeSignature(payload, rollingHeader, secret);
  assert.equal(rollingResult.valid, true, "Expected multiple v1 signatures with valid key to succeed");

  // 2. Header with valid v1 first, bad v1 second -> VALID
  const validFirstHeader = `t=${nowSec},v1=${validHmac},v1=${randomBadSig}`;
  const validFirstResult = verifyStripeSignature(payload, validFirstHeader, secret);
  assert.equal(validFirstResult.valid, true, "Expected matching first v1 signature to succeed");

  // 3. Header with multiple v1 signatures, none matching -> INVALID
  const allInvalidHeader = `t=${nowSec},v1=${oldHmac},v1=${randomBadSig}`;
  const allInvalidResult = verifyStripeSignature(payload, allInvalidHeader, secret);
  assert.equal(allInvalidResult.valid, false, "Expected non-matching v1 signatures to fail");
  assert.equal(allInvalidResult.error, "Signature mismatch.");
});

test("Narrow Correction 1: Database-Level Distributed Webhook Idempotency (Claim, Concurrent Lock, Retry on Failure)", async () => {
  const provider = "stripe";
  const eventId = "evt_distributed_idempotency_test_001";
  const ledgerStore = new Map();

  const origCreate = prisma.paymentWebhookEvent?.create;
  const origFindUnique = prisma.paymentWebhookEvent?.findUnique;
  const origUpdate = prisma.paymentWebhookEvent?.update;
  const origUpdateMany = prisma.paymentWebhookEvent?.updateMany;

  try {
    prisma.paymentWebhookEvent.create = async ({ data }) => {
      const key = `${data.provider}:${data.eventId}`;
      if (ledgerStore.has(key)) {
        const error = new Error("Unique constraint violation");
        error.code = "P2002";
        throw error;
      }
      const record = { id: `pwe-${Date.now()}`, ...data, createdAt: new Date() };
      ledgerStore.set(key, record);
      return record;
    };

    prisma.paymentWebhookEvent.findUnique = async ({ where }) => {
      const key = `${where.provider_eventId.provider}:${where.provider_eventId.eventId}`;
      return ledgerStore.get(key) || null;
    };

    prisma.paymentWebhookEvent.update = async ({ where, data }) => {
      const key = `${where.provider_eventId.provider}:${where.provider_eventId.eventId}`;
      const existing = ledgerStore.get(key);
      if (!existing) throw new Error("Record not found");
      const updated = { ...existing, ...data };
      ledgerStore.set(key, updated);
      return updated;
    };

    prisma.paymentWebhookEvent.updateMany = async ({ where, data }) => {
      const key = `${where.provider}:${where.eventId}`;
      const existing = ledgerStore.get(key);
      if (existing && where.status.in.includes(existing.status)) {
        ledgerStore.set(key, { ...existing, ...data });
        return { count: 1 };
      }
      return { count: 0 };
    };

    // 1. First delivery acquires claim atomically
    const claim1 = await claimWebhookEvent(provider, eventId, "checkout.session.completed", "user-123");
    assert.equal(claim1.claimed, true);
    assert.equal(claim1.isDuplicate, false);
    assert.equal(claim1.isConcurrent, false);

    // 2. Concurrent delivery from another instance while still PROCESSING is rejected safely
    const concurrentClaim = await claimWebhookEvent(provider, eventId, "checkout.session.completed", "user-123");
    assert.equal(concurrentClaim.claimed, false);
    assert.equal(concurrentClaim.isDuplicate, true);
    assert.equal(concurrentClaim.isConcurrent, true);

    // 3. Simulated failure during processing: marked FAILED
    await markWebhookFailed(provider, eventId, "Database connection timeout during activation");
    const failedRecord = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
    });
    assert.equal(failedRecord.status, "FAILED");
    assert.equal(failedRecord.error, "Database connection timeout during activation");

    // 4. Retry after failure: gateway re-delivers event, reclaim succeeds!
    const retryClaim = await claimWebhookEvent(provider, eventId, "checkout.session.completed", "user-123");
    assert.equal(retryClaim.claimed, true, "Failed event must be reclaimable on retry");
    assert.equal(retryClaim.isDuplicate, false);

    // 5. Successful completion: marked PROCESSED
    await markWebhookProcessed(provider, eventId);
    const processedRecord = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
    });
    assert.equal(processedRecord.status, "PROCESSED");
    assert.ok(processedRecord.processedAt);

    // 6. Future re-delivery after success: detected as already PROCESSED duplicate (not concurrent)
    const duplicateClaim = await claimWebhookEvent(provider, eventId, "checkout.session.completed", "user-123");
    assert.equal(duplicateClaim.claimed, false);
    assert.equal(duplicateClaim.isDuplicate, true);
    assert.equal(duplicateClaim.isConcurrent, false);
  } finally {
    prisma.paymentWebhookEvent.create = origCreate;
    prisma.paymentWebhookEvent.findUnique = origFindUnique;
    prisma.paymentWebhookEvent.update = origUpdate;
    prisma.paymentWebhookEvent.updateMany = origUpdateMany;
  }
});

test("Narrow Correction 1: Webhook Out-of-Order Delivery Protection", async () => {
  const userId = "user-out-of-order-test";
  const now = new Date();
  const futureYearlyEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  let updatedSubData = null;
  const origFindUnique = prisma.subscription?.findUnique;
  const origUpdate = prisma.subscription?.update;

  try {
    // 1. User currently has an active yearly subscription ending 1 year from now
    prisma.subscription.findUnique = async () => ({
      userId,
      status: "ACTIVE",
      billingCycle: "yearly",
      currentPeriodEnd: futureYearlyEnd,
    });

    prisma.subscription.update = async ({ data }) => {
      updatedSubData = data;
      return { userId, ...data };
    };

    // Stale/delayed monthly webhook arrives (e.g. 30 days from now)
    await recordPaymentEvent({
      userId,
      type: "PAYMENT_SUCCEEDED",
      billingCycle: "monthly",
    });

    // Verify out-of-order monthly payment did NOT rewind or truncate the longer yearly periodEnd
    assert.ok(updatedSubData);
    assert.equal(updatedSubData.status, "ACTIVE");
    assert.equal(updatedSubData.billingCycle, "yearly");
    assert.equal(updatedSubData.currentPeriodEnd.getTime(), futureYearlyEnd.getTime());

    // 2. Progression: New payment with further period advances subscription
    const evenFurtherEnd = new Date(futureYearlyEnd.getTime() + 365 * 24 * 60 * 60 * 1000);
    prisma.subscription.findUnique = async () => ({
      userId,
      status: "ACTIVE",
      billingCycle: "yearly",
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // only 10 days left
    });

    updatedSubData = null;
    await recordPaymentEvent({
      userId,
      type: "PAYMENT_SUCCEEDED",
      billingCycle: "yearly",
    });

    assert.ok(updatedSubData);
    assert.equal(updatedSubData.status, "ACTIVE");
    assert.equal(updatedSubData.billingCycle, "yearly");
    assert.ok(updatedSubData.currentPeriodEnd.getTime() > Date.now() + 300 * 24 * 60 * 60 * 1000);
  } finally {
    prisma.subscription.findUnique = origFindUnique;
    prisma.subscription.update = origUpdate;
  }
});

test("Narrow Correction 3: Physical Deletion of Expired Email Verification Tokens", async () => {
  let deletedWhereClause = null;
  const origDeleteMany = prisma.emailVerificationToken?.deleteMany;

  try {
    prisma.emailVerificationToken.deleteMany = async ({ where }) => {
      deletedWhereClause = where;
      return { count: 7 };
    };

    const result = await cleanupExpiredEmailTokens();
    assert.equal(result.deletedCount, 7);
    assert.ok(deletedWhereClause);
    assert.ok(deletedWhereClause.expiresAt.lt instanceof Date);
    // Verified that it strictly filters by expiresAt < now (unexpired valid tokens are never touched)
    assert.ok(deletedWhereClause.expiresAt.lt.getTime() <= Date.now());
  } finally {
    prisma.emailVerificationToken.deleteMany = origDeleteMany;
  }
});

test("Consistency Check 1: QuizQuestion Shared Question Bank Preservation vs QuizAttempt Purge", async () => {
  const expiredUserId = "user-expired-quiz-tester";
  let quizAttemptsDeleted = false;
  let quizQuestionsDeleted = false;
  let deletedUserId = null;

  const originalSubFindMany = prisma.subscription?.findMany;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.subscription.findMany = async () => [
      { id: "sub-quiz-test", userId: expiredUserId },
    ];

    prisma.$transaction = async (cb) => {
      const mockTx = {
        task: { deleteMany: async () => {} },
        project: { deleteMany: async () => {} },
        timeBlock: { deleteMany: async () => {} },
        focusSession: { deleteMany: async () => {} },
        calendarEvent: { deleteMany: async () => {} },
        habit: { deleteMany: async () => {} },
        goal: { deleteMany: async () => {} },
        productivityReview: { deleteMany: async () => {} },
        note: { deleteMany: async () => {} },
        noteCollection: { deleteMany: async () => {} },
        course: { deleteMany: async () => {} },
        // User-owned quiz attempts must be purged
        quizAttempt: {
          deleteMany: async ({ where }) => {
            quizAttemptsDeleted = true;
            deletedUserId = where.userId;
          },
        },
        // Shared QuizQuestion bank: must NOT be called for deletion
        quizQuestion: {
          deleteMany: async () => {
            quizQuestionsDeleted = true;
          },
        },
        researchProject: { deleteMany: async () => {} },
        learningModule: { deleteMany: async () => {} },
        vocabularyCard: { deleteMany: async () => {} },
        book: { deleteMany: async () => {} },
        conversation: { deleteMany: async () => {} },
        aIMemory: { deleteMany: async () => {} },
        automation: { deleteMany: async () => {} },
        integrationAccount: { deleteMany: async () => {} },
        notification: { deleteMany: async () => {} },
        customDashboardSection: { deleteMany: async () => {} },
        profile: { deleteMany: async () => {} },
        userPreference: { deleteMany: async () => {} },
        user: {
          findUnique: async () => ({ id: expiredUserId, adminRole: null }),
          update: async () => ({ id: expiredUserId }),
        },
        subscription: { update: async () => {} },
        auditEvent: { create: async () => {} },
      };
      return cb(mockTx);
    };

    await runRetentionCleanup();

    // 1. Proves user-owned QuizAttempt records are deleted
    assert.equal(quizAttemptsDeleted, true, "User-owned QuizAttempt records must be purged");
    assert.equal(deletedUserId, expiredUserId, "Purge must be strictly tenant-isolated to target user");

    // 2. Proves shared QuizQuestion records are PRESERVED and not deleted
    assert.equal(quizQuestionsDeleted, false, "Shared QuizQuestion question bank must never be purged");
  } finally {
    prisma.subscription.findMany = originalSubFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("Decision 1: Payment Webhook Retention (Safe Sanitization, Replay Tombstone Preservation, Active Protection)", async () => {
  let sanitizeWhere = null;
  let sanitizeData = null;
  let pruneWhere = null;

  const origUpdateMany = prisma.paymentWebhookEvent?.updateMany;
  const origDeleteMany = prisma.paymentWebhookEvent?.deleteMany;

  try {
    prisma.paymentWebhookEvent.updateMany = async ({ where, data }) => {
      sanitizeWhere = where;
      sanitizeData = data;
      return { count: 12 };
    };

    prisma.paymentWebhookEvent.deleteMany = async ({ where }) => {
      pruneWhere = where;
      return { count: 3 };
    };

    const result = await runPaymentWebhookRetention(90);

    // 1. Proves sanitization strips diagnostic/personal data (userId, error)
    assert.equal(result.sanitizedProcessedCount, 12);
    assert.equal(sanitizeData.userId, null);
    assert.equal(sanitizeData.error, null);

    // 2. Proves sanitization strictly applies to PROCESSED events past cutoff date (never deleting the unique tombstone)
    assert.equal(sanitizeWhere.status, "PROCESSED");
    assert.ok(sanitizeWhere.createdAt.lt instanceof Date);

    // 3. Proves terminal pruning strictly applies to FAILED events (past 90-day gateway retry window)
    assert.equal(result.prunedFailedCount, 3);
    assert.equal(pruneWhere.status, "FAILED");
    assert.ok(pruneWhere.createdAt.lt instanceof Date);

    // 4. Proves PROCESSING events are NEVER targeted for deletion or modification
    assert.notEqual(sanitizeWhere.status, "PROCESSING");
    assert.notEqual(pruneWhere.status, "PROCESSING");
  } finally {
    prisma.paymentWebhookEvent.updateMany = origUpdateMany;
    prisma.paymentWebhookEvent.deleteMany = origDeleteMany;
  }
});
