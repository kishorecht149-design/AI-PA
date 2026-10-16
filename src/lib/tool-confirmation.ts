import crypto from "crypto";
import { prisma } from "./prisma.ts";

/**
 * Resolves the server-side signing secret.
 * In production: Fails closed immediately if AUTH_SECRET is missing or < 32 characters.
 * In development/test: Permits fallback only if explicitly not in production.
 */
export function getConfirmationSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET is unconfigured or < 32 characters in production. Confirmation subsystem failing closed."
      );
    }
    return "amahas-secure-local-dev-secret-string-min32";
  }
  return secret;
}

export interface ToolConfirmationPayload {
  jti: string; // Unique token ID (UUID)
  userId: string;
  toolName: string;
  argsHash: string; // SHA-256 hash of normalized arguments
  exp: number; // Expiration timestamp (ms)
}

/**
 * Deterministically normalize and sort argument keys for consistent hashing.
 */
export function hashToolArgs(args: Record<string, any>): string {
  const sortedKeys = Object.keys(args || {}).sort();
  const normalized: Record<string, any> = {};
  for (const key of sortedKeys) {
    normalized[key] = args[key];
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

// In-process atomic reservation sets (bounded to 5,000 entries)
const inFlightReservationJtis = new Set<string>();
const spentTokenJtis = new Set<string>();

/**
 * Generate a cryptographically signed HMAC confirmation token.
 * Valid for 10 minutes.
 */
export function generateConfirmationToken(params: {
  userId: string;
  toolName: string;
  args: Record<string, any>;
}): string {
  const secret = getConfirmationSecret();
  const { userId, toolName, args } = params;
  const jti = `conf_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  const argsHash = hashToolArgs(args);
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes

  const payload: ToolConfirmationPayload = {
    jti,
    userId,
    toolName,
    argsHash,
    exp,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verify and consume a confirmation token.
 * Prevents:
 * 1. Missing or invalid secret (fails closed)
 * 2. Cross-user confirmation (userId mismatch)
 * 3. Tool substitution (toolName mismatch)
 * 4. Argument tampering (argsHash mismatch)
 * 5. Token expiration
 * 6. Concurrent race conditions (atomic in-flight reservation)
 * 7. Replay attacks (marks jti as spent both in-memory and in persistent audit log)
 */
export async function verifyAndConsumeConfirmationToken(params: {
  token: string;
  userId: string;
  toolName: string;
  args: Record<string, any>;
}): Promise<{ valid: boolean; reason?: string }> {
  let secret: string;
  try {
    secret = getConfirmationSecret();
  } catch (secErr: any) {
    return { valid: false, reason: secErr.message };
  }

  const { token, userId, toolName, args } = params;

  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing confirmation token." };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "Malformed confirmation token format." };
  }

  const [payloadStr, signature] = parts;

  // 1. Verify HMAC signature
  try {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadStr)
      .digest("base64url");

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return { valid: false, reason: "Invalid confirmation token signature." };
    }
  } catch {
    return { valid: false, reason: "Cryptographic signature verification failed." };
  }

  // 2. Parse payload
  let payload: ToolConfirmationPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "Invalid token payload JSON." };
  }

  // 3. Check expiration
  if (Date.now() > payload.exp) {
    return { valid: false, reason: "Confirmation token has expired." };
  }

  // 4. Check user binding (prevents cross-user confirmation)
  if (payload.userId !== userId) {
    return { valid: false, reason: "Confirmation token belongs to a different user." };
  }

  // 5. Check tool binding (prevents tool substitution)
  if (payload.toolName !== toolName) {
    return { valid: false, reason: "Confirmation token was issued for a different tool." };
  }

  // 6. Check argument binding (prevents argument tampering)
  const currentArgsHash = hashToolArgs(args);
  if (payload.argsHash !== currentArgsHash) {
    return { valid: false, reason: "Tool arguments do not match confirmed parameters." };
  }

  // 7. Atomic in-process mutex reservation (prevents concurrent requests from racing)
  if (spentTokenJtis.has(payload.jti) || inFlightReservationJtis.has(payload.jti)) {
    return {
      valid: false,
      reason: "Confirmation token has already been consumed or is concurrently in-flight (replay blocked).",
    };
  }

  // Synchronously claim in-flight lock before any async database queries
  inFlightReservationJtis.add(payload.jti);

  try {
    // 8. Check persistent replay in AuditEvent (L2 database check)
    if (prisma.auditEvent) {
      const existingSpent = await prisma.auditEvent.findFirst({
        where: {
          userId,
          action: `CONFIRMATION_SPENT:${payload.jti}`,
        },
        select: { id: true },
      });
      if (existingSpent) {
        spentTokenJtis.add(payload.jti);
        return { valid: false, reason: "Confirmation token already consumed in database." };
      }

      // Mark token as spent persistently
      await prisma.auditEvent.create({
        data: {
          userId,
          action: `CONFIRMATION_SPENT:${payload.jti}`,
          detailsJson: JSON.stringify({
            toolName,
            argsHash: payload.argsHash,
            consumedAt: new Date().toISOString(),
          }),
        },
      });
    }
  } catch (auditErr: any) {
    // If database unavailable, in-memory check remains enforced
    console.warn(`[Confirmation] Persistent audit replay check notice: ${auditErr.message}`);
  } finally {
    // Move from in-flight reservation to spent set
    inFlightReservationJtis.delete(payload.jti);
    spentTokenJtis.add(payload.jti);

    if (spentTokenJtis.size > 5000) {
      const toDelete = Array.from(spentTokenJtis).slice(0, 1000);
      for (const id of toDelete) spentTokenJtis.delete(id);
    }
  }

  return { valid: true };
}
