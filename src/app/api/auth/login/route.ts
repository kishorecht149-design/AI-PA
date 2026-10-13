import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const maxAgeSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    res.cookies.set(sessionCookieOptions.name, token, {
      ...sessionCookieOptions.options,
      maxAge: maxAgeSeconds,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Authentication error" },
      { status: 500 }
    );
  }
}
