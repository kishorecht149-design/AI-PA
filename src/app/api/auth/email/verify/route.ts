import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { activateFreeTrial } from "@/lib/subscription";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
  const origin = url.origin;

  if (!token || !email) {
    return NextResponse.redirect(`${origin}/login?error=Invalid verification link`);
  }

  const result = await verifyEmailToken(email, token);
  if (!result.success) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(result.error || "Verification failed")}`);
  }

  // If user exists and phone is verified, attempt free trial activation
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (user && user.phoneVerified) {
    await activateFreeTrial(user.id);
  }

  return NextResponse.redirect(`${origin}/dashboard?verified=true`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required." },
        { status: 400 }
      );
    }

    const result = await verifyEmailToken(email, token);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user && user.phoneVerified) {
      await activateFreeTrial(user.id);
    }

    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to verify email." }, { status: 500 });
  }
}
