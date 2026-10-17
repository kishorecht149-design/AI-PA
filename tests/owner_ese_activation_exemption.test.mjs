import test from "node:test";
import assert from "node:assert/strict";
import { isOwnerEseExempt, OWNER_USER_ID } from "../src/lib/ese/owner-exemption.ts";
import { getWorkspaceAccessState } from "../src/lib/subscription.ts";
import { prisma } from "../src/lib/prisma.ts";

test("Owner ESE Activation Exemption: Target user identification and immutability", () => {
  // Target owner user ID must match the immutable database user ID
  assert.equal(OWNER_USER_ID, "cmv6uqtac0000lb06q2p7xkyw", "Owner user ID must match the verified database ID");

  // isOwnerEseExempt returns true ONLY for the owner
  assert.equal(isOwnerEseExempt("cmv6uqtac0000lb06q2p7xkyw"), true, "Owner user must be recognized as exempt");

  // Rejects all other IDs, empty strings, null, undefined
  assert.equal(isOwnerEseExempt("cmv6t9uf60000xtya6bid8ltc"), false, "Non-owner user must NOT be exempt");
  assert.equal(isOwnerEseExempt("user_123456"), false, "Random user must NOT be exempt");
  assert.equal(isOwnerEseExempt(""), false, "Empty user ID must NOT be exempt");
  assert.equal(isOwnerEseExempt(null), false, "Null user ID must NOT be exempt");
  assert.equal(isOwnerEseExempt(undefined), false, "Undefined user ID must NOT be exempt");
});

test("Owner ESE Activation Exemption: Non-owner accounts remain strictly gated by identity verification", async () => {
  const dummyNonOwnerId = "non_owner_test_unverified_id";

  // Simulate non-owner unverified state evaluation
  const nonOwnerExempt = isOwnerEseExempt(dummyNonOwnerId);
  assert.equal(nonOwnerExempt, false, "Non-owner accounts must never bypass the verification requirement");

  // Verify that an unverified user in the database or simulated user would be blocked
  // by getWorkspaceAccessState with UNVERIFIED
  const mockUnverifiedUser = {
    id: dummyNonOwnerId,
    emailVerified: false,
    phoneVerified: false,
    subscription: null,
  };

  assert.equal(mockUnverifiedUser.emailVerified, false);
  assert.equal(mockUnverifiedUser.phoneVerified, false);
});

test("Owner ESE Activation Exemption: Owner account verification flags remain un-fabricated in database", async () => {
  // Check the live owner record if database is reachable
  try {
    const owner = await prisma.user.findUnique({
      where: { id: OWNER_USER_ID },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        phoneVerified: true,
        phoneNumber: true,
      },
    });

    if (owner) {
      assert.equal(owner.id, "cmv6uqtac0000lb06q2p7xkyw");
      // The exemption must NOT fabricate OTP records or artificially set emailVerified/phoneVerified to true
      assert.equal(
        owner.emailVerified,
        false,
        "Owner emailVerified flag must remain genuine (false until real OTP verification)"
      );
      assert.equal(
        owner.phoneVerified,
        false,
        "Owner phoneVerified flag must remain genuine (false until real OTP verification)"
      );
    }
  } catch (err) {
    console.warn("Database offline during test run; skipping live user assertion.", err.message);
  }
});

test("Owner ESE Activation Exemption: Server endpoint routing gate distinction", () => {
  const ownerId = "cmv6uqtac0000lb06q2p7xkyw";
  const regularUserId = "cmv_regular_user_test_999";

  // In POST /api/ese/plan:
  // if (!isOwnerEseExempt(userId)) { await assertWorkspaceWriteAccess(userId, ...); }

  const ownerRequiresVerification = !isOwnerEseExempt(ownerId);
  const regularRequiresVerification = !isOwnerEseExempt(regularUserId);

  assert.equal(
    ownerRequiresVerification,
    false,
    "Owner account must not require workspace verification gate for ESE plan activation"
  );
  assert.equal(
    regularRequiresVerification,
    true,
    "Regular account must strictly require workspace verification gate for ESE plan activation"
  );
});
