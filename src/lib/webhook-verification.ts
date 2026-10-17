import crypto from "crypto";

/**
 * Validates Stripe signature using standard cryptographic HMAC SHA-256 with timestamp tolerance.
 * Supports multiple v1 signatures (e.g. rolling secret scenarios).
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300
): { valid: boolean; error?: string } {
  try {
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.trim().startsWith("t="));
    const v1Signatures = parts
      .map((p) => p.trim())
      .filter((p) => p.startsWith("v1="))
      .map((p) => p.slice(3));

    if (!timestampPart || v1Signatures.length === 0) {
      return { valid: false, error: "Malformed stripe-signature header." };
    }

    const timestamp = timestampPart.trim().slice(2);
    const eventTime = parseInt(timestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);

    // Stale timestamp check (5-minute tolerance window)
    if (isNaN(eventTime) || Math.abs(nowSec - eventTime) > toleranceSec) {
      return { valid: false, error: "Stale webhook event timestamp exceeds tolerance window." };
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");

    let anyMatch = false;
    for (const sig of v1Signatures) {
      const sigBuf = Buffer.from(sig, "utf8");
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        anyMatch = true;
        break;
      }
    }

    if (!anyMatch) {
      return { valid: false, error: "Signature mismatch." };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * Validates Razorpay webhook signature.
 */
export function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    if (signature.length !== expected.length) {
      return { valid: false, error: "Signature mismatch." };
    }

    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return { valid: isValid, error: isValid ? undefined : "Signature mismatch." };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
