import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    let email = user?.email;

    if (!email) {
      const body = await req.json().catch(() => ({}));
      email = body.email;
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const result = await sendEmailVerification(email, url.origin);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          missingConfig: result.missingConfig,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verification link sent successfully.",
      ...(result.testToken ? { testToken: result.testToken } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to send email verification." },
      { status: 500 }
    );
  }
}
