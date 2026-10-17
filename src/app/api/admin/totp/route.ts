import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotpCode,
  generateRecoveryCodes,
  consumeRecoveryCode,
  assertAdminRole,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { adminRole: true, email: true, totpEnabled: true },
    });

    assertAdminRole(admin?.adminRole, "any");

    const secret = generateTotpSecret();
    const uri = generateTotpUri(admin!.email, secret);

    return NextResponse.json({
      secret,
      uri,
      totpEnabled: admin!.totpEnabled,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate TOTP secret." },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        adminRole: true,
        totpSecret: true,
        totpEnabled: true,
        recoveryCodes: true,
      },
    });

    assertAdminRole(admin?.adminRole, "any");

    const body = await req.json();
    const { secret, token, action } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Verification code or recovery code is required." },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // Mode A: Ongoing Session Verification (for users with TOTP already enabled)
    if (admin?.totpEnabled || action === "VERIFY") {
      if (!admin?.totpEnabled || !admin.totpSecret) {
        return NextResponse.json(
          { error: "Two-factor authentication is not enrolled on this account." },
          { status: 400 }
        );
      }

      // Check 1: 6-digit TOTP code
      if (/^\d{6}$/.test(cleanToken)) {
        const isValid = verifyTotpCode(admin.totpSecret, cleanToken);
        if (!isValid) {
          return NextResponse.json(
            { error: "Invalid authenticator code." },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          verified: true,
          method: "TOTP",
        });
      }

      // Check 2: Backup recovery code (format: XXXXXX-XXXXXX or alphanumeric)
      const isRecoveryValid = await consumeRecoveryCode(admin.id, cleanToken);
      if (isRecoveryValid) {
        return NextResponse.json({
          success: true,
          verified: true,
          method: "RECOVERY_CODE",
          message: "Authenticated via one-time backup recovery code. This code has now been burned.",
        });
      }

      return NextResponse.json(
        { error: "Invalid authenticator code or recovery code." },
        { status: 400 }
      );
    }

    // Mode B: Initial Enrollment
    if (!secret) {
      return NextResponse.json(
        { error: "TOTP secret is required for initial enrollment." },
        { status: 400 }
      );
    }

    const isValid = verifyTotpCode(secret, cleanToken);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid authenticator code. Verification failed." },
        { status: 400 }
      );
    }

    // Generate 8 secure backup recovery codes
    const { plainCodes, hashedCodes } = generateRecoveryCodes();

    // Persist secret and recovery codes
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        totpSecret: secret,
        totpEnabled: true,
        recoveryCodes: JSON.stringify(hashedCodes),
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Two-Factor Authentication (TOTP) successfully activated.",
      recoveryCodes: plainCodes,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to verify and activate TOTP." },
      { status: err.status || 500 }
    );
  }
}
