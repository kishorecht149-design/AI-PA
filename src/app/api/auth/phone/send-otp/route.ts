import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendPhoneOtp } from "@/lib/phone-verification";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const result = await sendPhoneOtp(phoneNumber, user?.id);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          code: (result as any).code || "OTP_SEND_FAILED",
          missingConfig: result.missingConfig,
        },
        { status: (result as any).code === "RATE_LIMITED" ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully.",
      // In test mode, expose testOtp
      ...(result.testOtp ? { testOtp: result.testOtp } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process OTP request." },
      { status: 500 }
    );
  }
}
