import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const origin = url.origin;

  let rememberMe = true;
  try {
    if (stateRaw) {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64").toString());
      rememberMe = parsed.rememberMe !== false;
    }
  } catch {}

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Google authentication cancelled`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?error=Google OAuth credentials not configured on server`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange error:", errText);
      return NextResponse.redirect(`${origin}/login?error=Failed to exchange token with Google`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch verified Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=Failed to fetch Google profile`);
    }

    const profileData = await profileRes.json();
    const email = profileData.email?.toLowerCase().trim();
    const name = profileData.name?.trim() || email.split("@")[0];
    const avatarUrl = profileData.picture;

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=No email provided by Google`);
    }

    // 3. Find or register user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const passwordHash = hashPassword(crypto.randomUUID());
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
          profile: {
            create: {
              institution: "Autonomous Intelligence Lab",
              program: "Applied Engineering & Research",
              academicYear: "Professional",
              primaryFocus: "Autonomous Systems & Intelligence",
              examinationTrack: "GENERAL",
            },
          },
          preferences: {
            create: {
              timeZone: "Asia/Kolkata",
              theme: "pure-black",
              aiModelPreference: "openrouter/free",
            },
          },
        },
      });
    }

    // 4. Create session token
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const maxAgeSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const res = NextResponse.redirect(`${origin}/dashboard`);

    res.cookies.set(sessionCookieOptions.name, token, {
      ...sessionCookieOptions.options,
      maxAge: maxAgeSeconds,
    });

    return res;
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || "OAuth failed")}`);
  }
}
