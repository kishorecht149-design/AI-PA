/**
 * AMAHAS Student OS — ESE Plan Activation Owner Exemption
 *
 * Implements an account-specific exception for ESE 600-Day Mastery plan activation.
 * Identified strictly by the immutable database user ID of the owner account.
 * Does not use display names or guess email addresses.
 */

export const OWNER_USER_ID = process.env.AMAHAS_OWNER_USER_ID || "cmv6uqtac0000lb06q2p7xkyw";

/**
 * Returns true strictly if the given user ID matches the immutable owner user ID.
 * Non-transferable, server-evaluated, and tenant-isolated.
 */
export function isOwnerEseExempt(userId?: string | null): boolean {
  if (!userId) return false;
  return userId === OWNER_USER_ID;
}
