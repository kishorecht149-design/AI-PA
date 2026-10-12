import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "amahas-secure-local-dev-secret-string-min32";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Hash a plain password using PBKDF2 with 100,000 iterations and random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against the stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  } catch {
    return false;
  }
}

/**
 * Create a signed session token.
 */
export function createSessionToken(payload: SessionUser): string {
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verify a session token and extract the user.
 */
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(data)
      .digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (Date.now() > payload.exp) {
      return null;
    }
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
