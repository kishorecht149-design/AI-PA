import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  SessionUser,
} from "./auth-crypto";

export * from "./auth-crypto";

const AUTH_COOKIE_NAME = "amahas_session";

/**
 * Get current authenticated user from server context.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    const user = verifySessionToken(token);
    if (!user) return null;

    // Verify user still exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true },
    });
    return dbUser || null;
  } catch {
    return null;
  }
}

/**
 * Cookie options helper.
 */
export const sessionCookieOptions = {
  name: AUTH_COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};
