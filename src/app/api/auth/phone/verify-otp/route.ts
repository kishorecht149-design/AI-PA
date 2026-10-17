import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { verifyPhoneOtp } from "@/lib/phone-verification";
import { activateFreeTrial } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in or register first." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phoneNumber, otp } = body;

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: "Phone number and verification code are required." },
        { status: 400 }
      );
    }

    const result = await verifyPhoneOtp(user.id, phoneNumber, otp);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code || "VERIFICATION_FAILED",
        },
        { status: 400 }
      );
    }

    // Attempt trial activation (checks if both email and phone are verified)
    let trialActivated = false;
    if (result.trialEligible) {
      const trialResult = await activateFreeTrial(user.id);
      trialActivated = trialResult.success;
    }

    return NextResponse.json({
      success: true,
      message: "Phone number successfully verified.",
      trialEligible: result.trialEligible,
      trialActivated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to verify phone OTP." },
      { status: 500 }
    );
  }
}
