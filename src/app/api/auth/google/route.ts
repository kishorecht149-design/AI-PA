import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, name, avatarUrl, rememberMe } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for Google authentication" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name?.trim() || cleanEmail.split("@")[0];

    // Find existing user or register a separate user for this Google account
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      const passwordHash = hashPassword(crypto.randomUUID());
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          passwordHash,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
          profile: {
            create: {
              institution: "Engineering & Applied Sciences",
              program: "B.Tech Computer Science & Engineering",
              academicYear: "3rd Year",
              primaryFocus: "GATE / ESE Prep & Systems Intelligence",
              examinationTrack: "GATE_CS",
            },
          },
          preferences: {
            create: {
              timeZone: "Asia/Kolkata",
              theme: "amahas-signature",
              aiModelPreference: "openrouter/free",
            },
          },
        },
      });
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 30 days if rememberMe, else 24 hours
    const maxAgeSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });

    res.cookies.set(sessionCookieOptions.name, token, {
      ...sessionCookieOptions.options,
      maxAge: maxAgeSeconds,
    });

    return res;
  } catch (err: any) {
    console.error("Google authentication error:", err);
    return NextResponse.json(
      { error: err.message || "Google authentication failed" },
      { status: 500 }
    );
  }
}
