import crypto from "crypto";
import { prisma } from "./prisma.ts";

export interface PhoneVerificationResult {
  success: boolean;
  error?: string;
  code?: string;
  missingConfig?: string[];
  trialEligible?: boolean;
}

/**
 * Normalizes phone numbers to standard E.164 international format.
 * Example: "+91 98765-43210" -> "+919876543210"
 * Example: "9876543210" with default country code -> "+919876543210"
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = "+91"): string {
  if (!rawPhone) return "";
  const cleaned = rawPhone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  // If starts with 00, replace with +
  if (cleaned.startsWith("00")) {
    return `+${cleaned.slice(2)}`;
  }
  // If starts with single 0, strip and apply default country code
  if (cleaned.startsWith("0")) {
    return `${defaultCountryCode}${cleaned.slice(1)}`;
  }
  // Otherwise prefix with default country code
  return `${defaultCountryCode}${cleaned}`;
}

/**
 * Generates a secure cryptographic 6-digit numeric OTP.
 */
export function generateOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Hashes an OTP with a unique salt using SHA-256.
 * Ensures OTP is never stored in plaintext in the database.
 */
export function hashOtp(otp: string, salt: string): string {
  return crypto.createHash("sha256").update(`${otp}:${salt}`).digest("hex");
}

/**
 * Checks if the SMS gateway provider is properly configured in the environment.
 */
export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Sends a phone verification OTP to the normalized phone number.
 * Enforces rate limiting: max 3 requests per 10-minute window.
 */
export async function sendPhoneOtp(
  rawPhone: string,
  userId?: string
): Promise<{ success: boolean; error?: string; code?: string; missingConfig?: string[]; testOtp?: string }> {
  const phoneNumber = normalizePhoneNumber(rawPhone);
  if (!phoneNumber || phoneNumber.length < 8) {
    return { success: false, error: "Please enter a valid mobile number with country code." };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

  // Check rate limits on phone number
  const existingRecord = await prisma.phoneVerification.findFirst({
    where: { phoneNumber },
    orderBy: { createdAt: "desc" },
  });

  if (existingRecord) {
    if (existingRecord.lastRequestAt > windowStart && existingRecord.requestCount >= 3) {
      const waitMinutes = Math.ceil(
        (existingRecord.lastRequestAt.getTime() + 10 * 60 * 1000 - now.getTime()) / 60000
      );
      return {
        success: false,
        error: `Too many OTP requests for this number. Please wait ${waitMinutes} minute(s) before trying again.`,
        code: "RATE_LIMITED",
      };
    }
  }

  // Pre-check 2-account limit before sending OTP if userId is known
  const verifiedAccountsCount = await prisma.user.count({
    where: {
      phoneNumber,
      phoneVerified: true,
      ...(userId ? { id: { not: userId } } : {}),
    },
  });

  if (verifiedAccountsCount >= 2) {
    return {
      success: false,
      error: "This phone number is already linked to the maximum allowed limit of 2 accounts.",
      code: "MAX_ACCOUNTS_EXCEEDED",
    };
  }

  // Generate OTP and salt
  const otp = generateOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry

  // Upsert or create verification record
  const requestCount =
    existingRecord && existingRecord.lastRequestAt > windowStart
      ? existingRecord.requestCount + 1
      : 1;

  if (existingRecord) {
    await prisma.phoneVerification.update({
      where: { id: existingRecord.id },
      data: {
        otpHash,
        salt,
        expiresAt,
        attempts: 0,
        verified: false,
        verifiedAt: null,
        lastRequestAt: now,
        requestCount,
      },
    });
  } else {
    await prisma.phoneVerification.create({
      data: {
        phoneNumber,
        otpHash,
        salt,
        expiresAt,
        attempts: 0,
        verified: false,
        requestCount,
        lastRequestAt: now,
      },
    });
  }

  // Dispatch SMS via configured provider
  if (isSmsConfigured()) {
    try {
      const authHeader = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64");

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const bodyParams = new URLSearchParams({
        To: phoneNumber,
        From: process.env.TWILIO_PHONE_NUMBER!,
        Body: `Your AMAHAS Student OS verification code is: ${otp}. Valid for 10 minutes. Never share this code.`,
      });

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Twilio SMS send error:", errorText);
        return {
          success: false,
          error: "Failed to deliver SMS. Please check your phone number and try again.",
        };
      }
    } catch (err: any) {
      console.error("SMS Gateway dispatch failure:", err);
      return { success: false, error: "SMS Gateway communication failure." };
    }
  } else {
    // SMS provider is unconfigured
    if (process.env.NODE_ENV === "test") {
      // In automated test suite, expose testOtp for cryptographic and rule assertions
      return { success: true, testOtp: otp };
    }

    return {
      success: false,
      error:
        "SMS gateway is not configured on the server. Please contact administrator or configure TWILIO credentials.",
      missingConfig: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
    };
  }

  return { success: true };
}

/**
 * Verifies a submitted phone OTP against stored record.
 * Enforces:
 * 1. Expiration check (10 min).
 * 2. Attempt limit (max 5 failed attempts).
 * 3. Constant-time hash verification.
 * 4. Concurrent race-condition safe max 2-account limit.
 * 5. Single trial eligibility tracking per phone number.
 */
export async function verifyPhoneOtp(
  userId: string,
  rawPhone: string,
  userSubmittedOtp: string
): Promise<PhoneVerificationResult> {
  const phoneNumber = normalizePhoneNumber(rawPhone);
  if (!phoneNumber || !userSubmittedOtp) {
    return { success: false, error: "Phone number and verification code are required." };
  }

  const cleanOtp = userSubmittedOtp.trim();
  const now = new Date();

  // Find verification record for this phone number
  const record = await prisma.phoneVerification.findFirst({
    where: { phoneNumber },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { success: false, error: "No verification request found for this phone number. Please request an OTP first." };
  }

  // 1. Check if already verified (anti-replay)
  if (record.verified) {
    return { success: false, error: "This OTP code has already been used. Please request a new code." };
  }

  // 2. Check expiration
  if (now > record.expiresAt) {
    return { success: false, error: "This OTP code has expired. Please request a new code." };
  }

  // 3. Check attempt limit (max 5 attempts)
  if (record.attempts >= 5) {
    return {
      success: false,
      error: "Maximum verification attempts exceeded. For your security, this code is now invalid. Please request a new code.",
    };
  }

  // 4. Verify OTP hash
  const computedHash = hashOtp(cleanOtp, record.salt);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(record.otpHash, "hex"),
    Buffer.from(computedHash, "hex")
  );

  if (!isValid) {
    // Increment attempts
    await prisma.phoneVerification.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    const remaining = 5 - (record.attempts + 1);
    return {
      success: false,
      error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
    };
  }

  // 5. Concurrency-safe check: Ensure max 2 verified accounts for this phone number
  // Execute within transaction to guard against concurrent registration race conditions
  return await prisma.$transaction(async (tx) => {
    const existingCount = await tx.user.count({
      where: {
        phoneNumber,
        phoneVerified: true,
        id: { not: userId },
      },
    });

    if (existingCount >= 2) {
      return {
        success: false,
        error: "Maximum of 2 accounts allowed per verified phone number. This number cannot be linked to another account.",
        code: "MAX_ACCOUNTS_EXCEEDED",
      };
    }

    // Determine trial eligibility: only the first verified account on this phone number gets a free trial
    const isFirstTrial = !record.trialClaimed;

    // Mark phone verification record as verified and invalidate OTP
    await tx.phoneVerification.update({
      where: { id: record.id },
      data: {
        verified: true,
        verifiedAt: now,
        trialClaimed: true,
      },
    });

    // Update user record with verified phone number
    await tx.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        phoneVerified: true,
        phoneVerifiedAt: now,
      },
    });

    return {
      success: true,
      trialEligible: isFirstTrial,
    };
  });
}
