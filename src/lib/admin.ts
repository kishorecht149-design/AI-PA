import crypto from "crypto";
import { prisma } from "./prisma.ts";

export type AdminRole = "owner" | "support_admin";

// -----------------------------------------------------------------------------
// RFC 6238 Standard Time-based One-Time Password (TOTP) Implementation
// Built using Node.js crypto (Zero external dependencies)
// -----------------------------------------------------------------------------

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret for TOTP (20 bytes = 160 bits).
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Generates an otpauth:// URL for scanning into Google Authenticator or 1Password.
 */
export function generateTotpUri(email: string, secret: string, issuer = "AMAHAS"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Computes a 6-digit TOTP code for a given timestamp and Base32 secret.
 */
export function computeTotp(secretBase32: string, time = Date.now(), stepSeconds = 30): string {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(time / 1000 / stepSeconds);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const token = (codeInt % 1000000).toString().padStart(6, "0");
  return token;
}

/**
 * Verifies a submitted TOTP code against the secret with a window of +/- 1 time step (tolerates 30s drift).
 */
export function verifyTotpCode(secretBase32: string, token: string): boolean {
  if (!secretBase32 || !token || token.trim().length !== 6) return false;
  const cleanToken = token.trim();
  const now = Date.now();

  for (let offset = -1; offset <= 1; offset++) {
    const checkTime = now + offset * 30 * 1000;
    const expected = computeTotp(secretBase32, checkTime);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

/**
 * Generates 8 secure backup recovery codes and their SHA-256 hashes.
 */
export function generateRecoveryCodes(): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const part1 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `${part1}-${part2}`;
    plainCodes.push(code);

    const hash = crypto.createHash("sha256").update(code).digest("hex");
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies and burns a backup recovery code.
 */
export async function consumeRecoveryCode(userId: string, enteredCode: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { recoveryCodes: true },
  });

  if (!user || !user.recoveryCodes) return false;

  let storedHashes: string[] = [];
  try {
    storedHashes = JSON.parse(user.recoveryCodes);
  } catch {
    return false;
  }

  const clean = enteredCode.trim().toUpperCase();
  const enteredHash = crypto.createHash("sha256").update(clean).digest("hex");

  const matchIdx = storedHashes.findIndex((h) => h === enteredHash);
  if (matchIdx === -1) return false;

  // Invalidate this code
  storedHashes.splice(matchIdx, 1);
  await prisma.user.update({
    where: { id: userId },
    data: { recoveryCodes: JSON.stringify(storedHashes) },
  });

  return true;
}

// -----------------------------------------------------------------------------
// Admin Permissions & Role Guard
// -----------------------------------------------------------------------------

export function assertAdminRole(role: string | null | undefined, requiredRole: "owner" | "any"): void {
  if (!role || (role !== "owner" && role !== "support_admin")) {
    const error: any = new Error("Access denied: Administrative privileges required.");
    error.status = 403;
    throw error;
  }

  if (requiredRole === "owner" && role !== "owner") {
    const error: any = new Error("Access denied: Operation restricted to Platform Owner only.");
    error.status = 403;
    throw error;
  }
}

/**
 * Controlled initial Owner provisioning.
 * Strictly enforces:
 * 1. Email matches INITIAL_ADMIN_EMAIL.
 * 2. Candidate user has verified email.
 * 3. Candidate user has verified phone.
 * 4. Anti-replacement: Fails if an active Owner already exists in the system.
 */
export async function provisionInitialOwner(candidateUserId: string): Promise<{
  success: boolean;
  error?: string;
  code?: string;
}> {
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
  if (!initialAdminEmail) {
    return { success: false, error: "INITIAL_ADMIN_EMAIL is not configured in server environment." };
  }

  const user = await prisma.user.findUnique({
    where: { id: candidateUserId },
    select: {
      id: true,
      email: true,
      adminRole: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  if (!user) {
    return { success: false, error: "Candidate user not found." };
  }

  if (user.email.toLowerCase() !== initialAdminEmail) {
    return { success: false, error: "Email does not match INITIAL_ADMIN_EMAIL configuration." };
  }

  // Anti-replacement guard: Prevent unauthorized owner override
  const existingOwner = await prisma.user.findFirst({
    where: { adminRole: "owner", id: { not: candidateUserId } },
  });

  if (existingOwner) {
    return {
      success: false,
      error: "Platform Owner has already been provisioned. Replacement is not permitted via environment bootstrapping.",
      code: "OWNER_ALREADY_EXISTS",
    };
  }

  // Identity verification check
  if (!user.emailVerified) {
    return {
      success: false,
      error: "Email verification is required before administrative ownership can be granted.",
      code: "EMAIL_UNVERIFIED",
    };
  }

  if (!user.phoneVerified) {
    return {
      success: false,
      error: "Phone verification is required before administrative ownership can be granted.",
      code: "PHONE_UNVERIFIED",
    };
  }

  // Promote persistently
  await prisma.user.update({
    where: { id: candidateUserId },
    data: { adminRole: "owner" },
  });

  await recordAdminAudit({
    adminId: candidateUserId,
    action: "PROVISION_INITIAL_OWNER",
    details: { email: user.email, method: "INITIAL_ADMIN_EMAIL_BOOTSTRAP" },
  });

  return { success: true };
}

// -----------------------------------------------------------------------------
// 15-Minute Support Edit Session Engine
// -----------------------------------------------------------------------------

export async function startSupportEditSession(params: {
  adminId: string;
  targetUserId: string;
  reason?: string;
  ipAddress?: string;
}): Promise<{ sessionId: string; expiresAt: Date }> {
  const admin = await prisma.user.findUnique({
    where: { id: params.adminId },
    select: { adminRole: true },
  });

  assertAdminRole(admin?.adminRole, "any");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // exactly 15 minutes

  const session = await prisma.adminSupportSession.create({
    data: {
      adminId: params.adminId,
      targetUserId: params.targetUserId,
      reason: params.reason || "Administrative support access",
      mode: "edit",
      startedAt: now,
      expiresAt,
    },
  });

  // Record in protected audit log
  await recordAdminAudit({
    adminId: params.adminId,
    targetUserId: params.targetUserId,
    action: "START_SUPPORT_EDIT_SESSION",
    details: {
      sessionId: session.id,
      reason: params.reason || "Administrative support access",
      expiresAt: expiresAt.toISOString(),
    },
    ipAddress: params.ipAddress,
  });

  return { sessionId: session.id, expiresAt };
}

/**
 * Server-side verification for support edit sessions.
 * Enforces strictly that the session is active and now <= expiresAt.
 */
export async function assertActiveSupportSession(sessionId: string): Promise<void> {
  const session = await prisma.adminSupportSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    const error: any = new Error("Support session not found.");
    error.status = 403;
    throw error;
  }

  if (session.endedAt) {
    const error: any = new Error("Support session has already ended.");
    error.status = 403;
    throw error;
  }

  if (new Date() > session.expiresAt) {
    const error: any = new Error("Support edit session has expired (15-minute maximum limit reached).");
    error.status = 403;
    throw error;
  }
}

// -----------------------------------------------------------------------------
// 90-Day Admin Audit Logging
// -----------------------------------------------------------------------------

export async function recordAdminAudit(params: {
  adminId: string;
  targetUserId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        targetUserId: params.targetUserId || null,
        action: params.action,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Failed to write admin audit log:", err);
  }
}

/**
 * Removes internal admin audit log records older than 90 days.
 */
export async function cleanupExpiredAuditLogs(): Promise<{ deletedCount: number }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.adminAuditLog.deleteMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
    },
  });

  return { deletedCount: result.count };
}
