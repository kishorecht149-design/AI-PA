import crypto from "crypto";
import { prisma } from "./prisma.ts";

export interface EmailVerificationResult {
  success: boolean;
  error?: string;
  missingConfig?: string[];
  testToken?: string;
}

/**
 * Checks if email service provider is configured in environment.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

/**
 * Generates an email verification token, hashes it, and stores it in the database.
 */
export async function sendEmailVerification(
  email: string,
  appUrl?: string
): Promise<EmailVerificationResult> {
  const cleanEmail = email.toLowerCase().trim();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token hash to database
  await prisma.emailVerificationToken.create({
    data: {
      email: cleanEmail,
      tokenHash,
      expiresAt,
    },
  });

  const baseUrl = appUrl || process.env.NEXTAUTH_URL || "https://amahasai.vercel.app";
  const verificationLink = `${baseUrl}/api/auth/email/verify?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

  if (isEmailConfigured()) {
    try {
      if (process.env.RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AMAHAS Verification <security@amahas.ai>",
            to: cleanEmail,
            subject: "Verify your email for AMAHAS Student OS",
            html: `
              <h2>Welcome to AMAHAS Student OS</h2>
              <p>Please click the link below to verify your email and activate your account:</p>
              <p><a href="${verificationLink}">${verificationLink}</a></p>
              <p>This link will expire in 24 hours.</p>
            `,
          }),
        });
        if (!res.ok) {
          console.error("Resend API failed:", await res.text());
          return { success: false, error: "Email delivery failed." };
        }
      }
    } catch (e: any) {
      console.error("Email delivery exception:", e);
      return { success: false, error: "Failed to communicate with email delivery gateway." };
    }
  } else {
    // Service unconfigured
    if (process.env.NODE_ENV === "test") {
      return { success: true, testToken: rawToken };
    }
    return {
      success: false,
      error: "Email delivery provider is not configured. Please configure RESEND_API_KEY or SMTP credentials.",
      missingConfig: ["RESEND_API_KEY"],
    };
  }

  return { success: true };
}

/**
 * Verifies a submitted email token.
 */
export async function verifyEmailToken(
  email: string,
  rawToken: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date();

  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      email: cleanEmail,
      tokenHash,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { success: false, error: "Invalid or nonexistent verification token." };
  }

  if (record.verified) {
    return { success: false, error: "Email token has already been used." };
  }

  if (now > record.expiresAt) {
    return { success: false, error: "Email verification link has expired. Please request a new one." };
  }

  // Mark token verified and update user
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { verified: true },
    }),
    prisma.user.updateMany({
      where: { email: cleanEmail },
      data: {
        emailVerified: true,
        emailVerifiedAt: now,
      },
    }),
  ]);

  return { success: true };
}

/**
 * Physically purges expired EmailVerificationToken records from the database.
 * Unexpired valid tokens are strictly preserved.
 */
export async function cleanupExpiredEmailTokens(): Promise<{ deletedCount: number }> {
  const now = new Date();
  const result = await prisma.emailVerificationToken.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  return { deletedCount: result.count };
}
